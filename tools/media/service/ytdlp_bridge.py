"""Private JSON-lines bridge. Configuration and credentials arrive over stdin."""
import json
import os
import sys
import tempfile
from pathlib import Path

import yt_dlp


def emit(value):
    print(json.dumps(value, ensure_ascii=True), flush=True)


class QuietLogger:
    def debug(self, message):
        pass
    def warning(self, message):
        pass
    def error(self, message):
        pass


def error_code(error):
    message = str(error).lower()
    if 'fresh cookies' in message:
        return 'FRESH_COOKIES'
    if any(x in message for x in ('cookie', 'sign in', 'login', 'log in', '登录', 'bot', 'confirm your age')):
        return 'LOGIN_REQUIRED'
    if any(x in message for x in ('private', 'not available', 'removed', 'deleted', '404', 'unavailable')):
        return 'UNAVAILABLE'
    if any(x in message for x in ('timed out', 'connection', 'proxy', 'resolve', 'network', '403', '412', '429')):
        return 'NETWORK'
    return 'EXTRACT_FAILED'


def main():
    config = json.load(sys.stdin)
    directory = Path(config['directory']).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    cookie_path = None
    try:
        if config.get('cookieText'):
            handle = tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=directory, prefix='cookie-', delete=False)
            cookie_path = handle.name
            with handle:
                handle.write(config['cookieText'])
            os.chmod(cookie_path, 0o600)

        def progress(data):
            if data.get('downloaded_bytes', 0) > 2 * 1024 ** 3:
                raise yt_dlp.utils.DownloadError('Video exceeds service size limit')
            total = data.get('total_bytes') or data.get('total_bytes_estimate') or 0
            emit({'event': 'progress', 'downloaded': data.get('downloaded_bytes', 0), 'total': total,
                  'status': data.get('status', 'downloading')})

        options = {
            'quiet': True, 'no_warnings': True, 'logger': QuietLogger(),
            'noplaylist': True, 'playlistend': 1, 'socket_timeout': 20, 'retries': 1,
            'extractor_retries': 1, 'fragment_retries': 1, 'cachedir': False,
            'js_runtimes': {'node': {'path': config['node']}},
            'allowed_extractors': [config['extractor']],
            'cookiefile': cookie_path,
            'outtmpl': str(directory / 'video.%(ext)s'), 'overwrites': False,
            'format': config.get('format', 'bestvideo+bestaudio/best'),
            'merge_output_format': 'mp4',
            'postprocessors': [{'key': 'FFmpegVideoRemuxer', 'preferedformat': 'mp4'}],
            'progress_hooks': [progress] if config['mode'] == 'download' else [],
            'postprocessor_hooks': [lambda data: emit({'event': 'merging'})] if config['mode'] == 'download' else [],
            'concurrent_fragment_downloads': 2,
            'max_filesize': 2 * 1024 ** 3,
        }
        if config.get('ffmpeg'):
            options['ffmpeg_location'] = config['ffmpeg']
        with yt_dlp.YoutubeDL(options) as downloader:
            if config['mode'] == 'inspect':
                info = downloader.extract_info(config['url'], download=False)
                emit({'event': 'info', 'info': downloader.sanitize_info(info)})
            else:
                downloader.process_ie_result(config['info'], download=True)
                files = list(directory.glob('video.mp4'))
                if not files:
                    raise RuntimeError('MP4 output missing')
                emit({'event': 'ready', 'file': files[0].name})
    except Exception as error:
        emit({'event': 'error', 'code': error_code(error)})
        sys.exit(1)
    finally:
        if cookie_path:
            Path(cookie_path).unlink(missing_ok=True)


if __name__ == '__main__':
    main()
