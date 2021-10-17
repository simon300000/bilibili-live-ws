import { Buffer } from 'buffer'

import decompression from 'brotli/decompress'
import { inflate } from 'pako'

const inflateAsync = (d: Buffer) => Buffer.from(inflate(d))
const brotliDecompressAsync = (d: Buffer) => Buffer.from(decompression(d))

export const inflates = { inflateAsync, brotliDecompressAsync }
