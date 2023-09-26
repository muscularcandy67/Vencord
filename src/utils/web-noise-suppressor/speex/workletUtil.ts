import type { TypedAudioWorkletOptions } from '../utils/TypedAudioWorklet'
import type { SpeexProcessorOptions } from './options'

export const id = '@sapphi-red/web-noise-suppressor/speex'

export type SpeexWorkletOptions =
  TypedAudioWorkletOptions<SpeexProcessorOptions>
