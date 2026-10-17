// Generates a simple PNG of a building silhouette, used as a placeholder "building photo"
// in seed data and the simulator. Node only (scripts).
import { crc32, deflateSync } from "node:zlib";

/** A simple 320x200 PNG of a building silhouette, labelled as a placeholder by its path. */
export function placeholderBuildingPng(variant: number): Buffer {
  const width = 320;
  const height = 200;
  const palettes: [number, number, number][][] = [
    [[176, 214, 240], [222, 196, 160], [150, 70, 50], [110, 160, 90], [90, 60, 40]],
    [[200, 225, 245], [235, 225, 205], [90, 90, 110], [130, 170, 100], [70, 70, 90]],
    [[245, 215, 170], [210, 170, 130], [120, 50, 40], [160, 140, 80], [80, 50, 30]],
    [[190, 220, 230], [240, 240, 235], [60, 110, 150], [100, 150, 90], [40, 70, 100]],
  ];
  const [sky, wall, roof, ground, door] = palettes[variant % palettes.length]!;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      let c = y > 160 ? ground! : sky!;
      const inWall = x >= 70 && x <= 250 && y >= 90 && y <= 160;
      const roofHalf = (y - 40) * 1.9;
      const inRoof = y >= 40 && y < 90 && Math.abs(x - 160) <= roofHalf;
      const inDoor = x >= 145 && x <= 175 && y >= 115 && y <= 160;
      const inWindow = (x >= 90 && x <= 125 && y >= 105 && y <= 130) || (x >= 195 && x <= 230 && y >= 105 && y <= 130);
      if (inRoof) c = roof!;
      if (inWall) c = wall!;
      if (inWindow) c = door!;
      if (inDoor) c = door!;
      const o = y * (width * 3 + 1) + 1 + x * 3;
      raw[o] = c[0];
      raw[o + 1] = c[1];
      raw[o + 2] = c[2];
    }
  }
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
