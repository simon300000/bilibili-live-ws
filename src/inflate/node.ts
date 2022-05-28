import { Buffer } from 'buffer'
import { inflate, brotliDecompress } from 'zlib'
import { promisify } from 'util'

const inflateAsync = promisify<Parameters<typeof inflate>[0], Parameters<Parameters<typeof inflate>[2]>[1]>(inflate)
const brotliDecompressAsync = promisify<Parameters<typeof brotliDecompress>[0], Parameters<Parameters<typeof brotliDecompress>[1]>[1]>(brotliDecompress)

export const inflates = { inflateAsync, brotliDecompressAsync, Buffer }
