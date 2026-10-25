# Generated test media

These one-second synthetic fixtures contain no third-party media. Regenerate with:

```powershell
ffmpeg -f lavfi -i testsrc=size=96x64:rate=12:duration=1 -c:v libx264 -pix_fmt yuv420p -an -y video.mp4
ffmpeg -f lavfi -i sine=frequency=440:sample_rate=48000:duration=1 -c:a aac -b:a 64k -vn -y audio.m4a
```
