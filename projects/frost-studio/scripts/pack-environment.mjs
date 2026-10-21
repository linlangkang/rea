import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { FloatType } from "three";

// Average radiance in linear HDR space; never downsample an sRGB preview as environment light.
const source = readFileSync("public/materials/environment.hdr");
const parsed = new HDRLoader()
  .setDataType(FloatType)
  .parse(
    source.buffer.slice(
      source.byteOffset,
      source.byteOffset + source.byteLength,
    ),
  );
const width = 512,
  height = Math.round((parsed.height * width) / parsed.width),
  stride = parsed.data.length / (parsed.width * parsed.height);
const bytes = [
  Buffer.from(
    "#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y " +
      height +
      " +X " +
      width +
      "\n",
  ),
];
for (let y = 0; y < height; y++) {
  const channels = Array.from({ length: 4 }, () => new Uint8Array(width));
  for (let x = 0; x < width; x++) {
    const sum = [0, 0, 0];
    let count = 0;
    for (
      let yy = Math.floor((y * parsed.height) / height);
      yy < Math.floor(((y + 1) * parsed.height) / height);
      yy++
    )
      for (
        let xx = Math.floor((x * parsed.width) / width);
        xx < Math.floor(((x + 1) * parsed.width) / width);
        xx++
      ) {
        const index = (yy * parsed.width + xx) * stride;
        for (let c = 0; c < 3; c++) sum[c] += parsed.data[index + c];
        count++;
      }
    const rgb = sum.map((v) => v / count),
      max = Math.max(...rgb);
    if (max > 1e-32) {
      const exponent = Math.ceil(Math.log2(max)),
        scale = 256 / 2 ** exponent;
      for (let c = 0; c < 3; c++)
        channels[c][x] = Math.min(255, Math.max(0, Math.floor(rgb[c] * scale)));
      channels[3][x] = exponent + 128;
    }
  }
  bytes.push(Buffer.from([2, 2, width >> 8, width & 255]));
  for (const channel of channels)
    for (let x = 0; x < width; ) {
      let end = x + 1;
      while (end < width && end - x < 127 && channel[end] === channel[x]) end++;
      if (end - x >= 4) {
        bytes.push(Buffer.from([128 + end - x, channel[x]]));
        x = end;
      } else {
        const begin = x;
        x = end;
        while (x < width && x - begin < 127) {
          let run = x + 1;
          while (run < width && run - x < 4 && channel[run] === channel[x])
            run++;
          if (run - x >= 4) break;
          x++;
        }
        bytes.push(
          Buffer.from([x - begin]),
          Buffer.from(channel.subarray(begin, x)),
        );
      }
    }
}
const output = Buffer.concat(bytes),
  hash = createHash("sha256").update(output).digest("hex").slice(0, 12);
const path = `materials/optimized/environment.${hash}.hdr`;
mkdirSync("public/materials/optimized", { recursive: true });
writeFileSync("public/" + path, output);
const verify = new HDRLoader()
  .setDataType(FloatType)
  .parse(
    output.buffer.slice(
      output.byteOffset,
      output.byteOffset + output.byteLength,
    ),
  );
if (verify.width !== width || verify.height !== height)
  throw Error("HDR round-trip dimensions differ");
const manifest = JSON.parse(
  readFileSync("src/scene/render-assets.json", "utf8"),
);
manifest["materials/environment.hdr"] = path;
writeFileSync(
  "src/scene/render-assets.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
const licensePath = "public/licenses/runtime-assets.json",
  license = JSON.parse(readFileSync(licensePath, "utf8"));
license.files = license.files.filter(
  (file) => file.logical !== "materials/environment.hdr",
);
license.files.push({
  logical: "materials/environment.hdr",
  runtime: path,
  bytes: output.length,
  size: [width, height],
  dataMap: true,
  encoding: "Linear radiance averaged, RGBE HDR; not an sRGB preview",
  sourceManifest: "materials/fouriesburg_mountain_cloudy-license.json",
});
writeFileSync(licensePath, JSON.stringify(license, null, 2) + "\n");
console.log(
  JSON.stringify({
    originalBytes: source.length,
    runtimeBytes: output.length,
    width,
    height,
    path,
  }),
);
