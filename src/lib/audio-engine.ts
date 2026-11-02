export interface AcousticProfileConfig {
  reverbWetMix: number;
  roomAmbienceDb: number;
  audioLevel: number;
  enableSurroundProcessing: boolean;
}

export class CinemaAudioEngine {
  private ctx: AudioContext | null = null;
  private attachedVideos = new WeakMap<HTMLVideoElement, MediaElementAudioSourceNode>();
  private masterGain: GainNode | null = null;
  private stereoPanner: StereoPannerNode | null = null;
  private distanceFilter: BiquadFilterNode | null = null;
  private convolver: ConvolverNode | null = null;
  private wetGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private graphReady = false;

  /**
   * Connects the HTML5 <video> element to the Web Audio API graph on user interaction.
   * Calling createMediaElementSource automatically routes the video's audio stream exclusively
   * through the Web Audio graph, preventing any audio duplication with native video output.
   */
  public async attachVideoElement(
    videoElement: HTMLVideoElement,
    acousticProfile?: AcousticProfileConfig
  ): Promise<void> {
    if (typeof window === "undefined") return;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    if (!this.graphReady) {
      this.masterGain = this.ctx.createGain();
      this.stereoPanner = this.ctx.createStereoPanner();
      this.distanceFilter = this.ctx.createBiquadFilter();
      this.distanceFilter.type = "lowpass";
      this.distanceFilter.frequency.value = 18500;

      this.dryGain = this.ctx.createGain();
      this.wetGain = this.ctx.createGain();
      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = this.createAuditoriumImpulseResponse(1.6, 2.5);

      const wetMix = acousticProfile?.enableSurroundProcessing
        ? (acousticProfile.reverbWetMix ?? 0.2)
        : 0;
      this.wetGain.gain.value = wetMix;
      this.dryGain.gain.value = 1 - wetMix * 0.35;

      this.distanceFilter.connect(this.stereoPanner);
      this.stereoPanner.connect(this.dryGain);
      this.dryGain.connect(this.masterGain);

      this.stereoPanner.connect(this.convolver);
      this.convolver.connect(this.wetGain);
      this.wetGain.connect(this.masterGain);

      this.masterGain.connect(this.ctx.destination);
      this.graphReady = true;
    }

    if (!this.attachedVideos.has(videoElement) && this.distanceFilter) {
      const source = this.ctx.createMediaElementSource(videoElement);
      source.connect(this.distanceFilter);
      this.attachedVideos.set(videoElement, source);
    }
  }

  /**
   * Dynamically adjusts stereo panning and high-frequency distance roll-off
   * based on the exact 3D seat coordinates relative to the screen.
   */
  public updateSeatAcoustics(
    seatPos: { posX: number; posY: number; posZ: number },
    auditoriumWidth: number,
    distanceToScreen: number,
    spatialEnabled: boolean
  ): void {
    if (!this.ctx || !this.stereoPanner || !this.distanceFilter || !this.wetGain) return;

    if (!spatialEnabled) {
      this.stereoPanner.pan.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.distanceFilter.frequency.setTargetAtTime(20000, this.ctx.currentTime, 0.05);
      this.wetGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      return;
    }

    const halfWidth = Math.max(4, auditoriumWidth / 2);
    const normalizedX = Math.max(-1, Math.min(1, seatPos.posX / halfWidth));
    // Left seat (neg X) hears screen center biased slightly toward right ear (+pan)
    const subtlePan = -normalizedX * 0.34;
    this.stereoPanner.pan.setTargetAtTime(subtlePan, this.ctx.currentTime, 0.08);

    const cutoffFreq = Math.max(10500, 20000 - distanceToScreen * 190);
    this.distanceFilter.frequency.setTargetAtTime(cutoffFreq, this.ctx.currentTime, 0.08);
    this.wetGain.gain.setTargetAtTime(0.2, this.ctx.currentTime, 0.08);
  }

  public setVolume(volume: number, muted: boolean): void {
    if (!this.ctx || !this.masterGain) return;
    const effectiveGain = muted ? 0 : Math.max(0, Math.min(1.2, volume));
    this.masterGain.gain.setTargetAtTime(effectiveGain, this.ctx.currentTime, 0.03);
  }

  private createAuditoriumImpulseResponse(durationSeconds: number, decayRate: number): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const length = Math.floor(sampleRate * durationSeconds);
    const impulse = this.ctx!.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const envelope = Math.pow(1 - i / length, decayRate);
        channelData[i] = (Math.random() * 2 - 1) * envelope * 0.32;
      }
    }
    return impulse;
  }
}

export const cinemaAudioEngine = new CinemaAudioEngine();
