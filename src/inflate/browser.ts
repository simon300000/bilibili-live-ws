import { Buffer } from 'buffer'

import { BrotliDecode } from './brotli'
import { inflate } from 'pako'

const inflateAsync = (d: Buffer) => Buffer.from(inflate(d))
const brotliDecompressAsync = (d: Buffer) => Buffer.from(BrotliDecode(Int8Array.from(d)))

export const inflates = { inflateAsync, brotliDecompressAsync }
