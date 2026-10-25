import { Input, UrlSource, MP4, Output, Mp4OutputFormat, BufferTarget, StreamTarget, EncodedPacketSink, EncodedVideoPacketSource, EncodedAudioPacketSource } from '../../../assets/vendor/mediabunny-1.62.1/mediabunny.min.mjs';

// Packet copy only: no decoding, quality loss or WebCodecs dependency.
export async function muxMp4({videoUrl, audioUrl, writable, signal, duration, onProgress = () => {}}) {
  const inputs = [];
  let output;
  let progress = 0;
  const abort = () => { for (const input of inputs) input.dispose(); };
  signal?.throwIfAborted();
  signal?.addEventListener('abort', abort, {once:true});
  try {
    const open = urls => {
      urls = Array.isArray(urls) ? urls : [urls];
      const source = new UrlSource(urls[0], {
        maxCacheSize:16*1024*1024,parallelism:1,getRetryDelay:n => n < 2 ? 1 : null,
        fetchFn:async (resource,init) => {
          let lastError;
          for (const url of urls) {
            signal?.throwIfAborted();
            try {
              const response = await fetch(url,init);
              if (response.ok || response.status === 416) return response;
              await response.body?.cancel();
            } catch (error) { lastError = error; }
          }
          throw lastError || new Error('视频流连接失败，请重新解析后下载。');
        }
      });
      const input = new Input({source,formats:[MP4]}); inputs.push(input); return input;
    };
    const videoInput = open(videoUrl);
    const audioInput = audioUrl ? open(audioUrl) : videoInput;
    const video = await videoInput.getPrimaryVideoTrack();
    const audio = await audioInput.getPrimaryAudioTrack();
    if (!video?.codec) throw new Error('无法读取视频轨道，请重新解析或换一种编码。');
    if (audioUrl && !audio?.codec) throw new Error('无法读取声音轨道，请重新解析后重试。');
    // The caller commits the file only after success; cancel must abort the file,
    // rather than committing the partial output when StreamTarget closes.
    const target = writable ? new StreamTarget(new WritableStream({write:chunk => writable.write(chunk)}), {chunked:true,chunkSize:4*1024*1024}) : new BufferTarget();
    output = new Output({format:new Mp4OutputFormat({fastStart:writable ? false : 'in-memory'}),target});
    const videoSource = new EncodedVideoPacketSource(video.codec);
    output.addVideoTrack(videoSource, {rotation:await video.getRotation()});
    const audioSource = audio?.codec ? new EncodedAudioPacketSource(audio.codec) : null;
    if (audioSource) output.addAudioTrack(audioSource);
    await output.start();
    const copy = async (track, source, kind) => {
      const decoderConfig = await track.getDecoderConfig();
      let first = true;
      for await (const packet of new EncodedPacketSink(track).packets()) {
        signal?.throwIfAborted();
        await source.add(packet, first ? {decoderConfig} : undefined);
        first = false;
        if (kind === 'video') { progress = Math.max(progress,Math.min(.99, Math.max(0, packet.timestamp / duration))); onProgress(progress); }
      }
      source.close();
    };
    await Promise.all([copy(video,videoSource,'video'), ...(audioSource ? [copy(audio,audioSource,'audio')] : [])]);
    signal?.throwIfAborted();
    await output.finalize();
    onProgress(1);
    return writable ? null : new Blob([target.buffer],{type:'video/mp4'});
  } catch (error) {
    abort();
    try { await output?.cancel(); } catch { /* Preserve original failure. */ }
    throw error;
  } finally {
    signal?.removeEventListener('abort',abort);
    for (const input of inputs) input.dispose();
  }
}
