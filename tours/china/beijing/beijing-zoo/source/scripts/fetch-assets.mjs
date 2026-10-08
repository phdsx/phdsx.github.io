import fs from "node:fs/promises";
await fs.mkdir("public/models", { recursive: true });
const jobs = [
  [
    "research/vr-cats-readme.md",
    "https://raw.githubusercontent.com/code4fukui/vr-cats/main/README.md",
  ],
  [
    "research/unirig-readme.md",
    "https://raw.githubusercontent.com/VAST-AI-Research/UniRig/main/README.md",
  ],
  [
    "research/unirig-license.txt",
    "https://raw.githubusercontent.com/VAST-AI-Research/UniRig/main/LICENSE",
  ],
  [
    "research/3dassets-pack.html",
    "https://3dassets.dev/packs/exotic-wildlife-hd",
  ],
  [
    "public/models/lion.glb",
    "https://raw.githubusercontent.com/code4fukui/vr-cats/main/lion.glb",
  ],
  [
    "research/giraffe-preview.glb",
    "https://raw.githubusercontent.com/VAST-AI-Research/UniRig/main/examples/giraffe.glb",
  ],
];
await Promise.all(
  jobs.map(async ([name, url]) => {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "PHDSX-ZooResearch/1.0" },
        signal: AbortSignal.timeout(45000),
      });
      if (!r.ok) throw Error(r.status);
      const b = Buffer.from(await r.arrayBuffer());
      await fs.writeFile(name, b);
      console.log(name, b.length);
    } catch (e) {
      console.log(name, e.message);
    }
  }),
);
