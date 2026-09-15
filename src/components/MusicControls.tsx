import { useCallback, useEffect, useRef, useState } from 'react';
import { useWeddingConfig } from '../context/WeddingContext';
import { Icon } from './Icon';
export function useMusic() {
  const weddingConfig = useWeddingConfig();
  const [enabled, setEnabled] = useState(false),
    [volume, setVolume] = useState<number>(weddingConfig.music.defaultVolume),
    [error, setError] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null),
    started = useRef(false);
  const getAudio = useCallback(() => {
    if (!audio.current) {
      const base = new URL(import.meta.env.BASE_URL, window.location.origin);
      audio.current = new Audio(new URL(weddingConfig.music.src, base).href);
      audio.current.loop = true;
    }
    return audio.current;
  }, [weddingConfig.music.src]);
  const play = useCallback(() => {
    const a = getAudio();
    a.volume = volume;
    void a.play().catch(() => {
      if (audio.current !== a) return;
      setError('Music could not play. Tap the music button to try again.');
      setEnabled(false);
    });
  }, [getAudio, volume]);
  const enter = () => {
    started.current = true;
    if (enabled) play();
  };
  const toggle = () => {
    setError('');
    if (enabled) {
      audio.current?.pause();
      setEnabled(false);
    } else {
      setEnabled(true);
      if (started.current) play();
    }
  };
  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);
  useEffect(
    () => () => {
      const previousAudio = audio.current;
      audio.current = null;
      started.current = false;
      if (previousAudio) {
        previousAudio.pause();
        previousAudio.removeAttribute('src');
        previousAudio.load();
      }
    },
    [weddingConfig.music.src],
  );
  return { enabled, volume, setVolume, toggle, enter, error };
}
export function MusicControls({ music }: { music: ReturnType<typeof useMusic> }) {
  const weddingConfig = useWeddingConfig();
  return (
    <div className="music-panel">
      <Icon name="music" size={45} />
      <p>
        {weddingConfig.music.src === 'audio/garden-melody.wav'
          ? 'A gentle original melody for your garden stroll.'
          : 'A melody chosen for this celebration.'}
      </p>
      <button className="secondary" onClick={music.toggle}>
        <Icon name={music.enabled ? 'volume' : 'muted'} />
        Music {music.enabled ? 'on' : 'off'}
      </button>
      <label>
        Volume <span>{Math.round(music.volume * 100)}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={music.volume}
          onChange={(e) => music.setVolume(Number(e.target.value))}
        />
      </label>
      {music.error && (
        <p role="status" className="form-error">
          {music.error}
        </p>
      )}
    </div>
  );
}
