import * as React from "react";
import { Loader2, Pause, Play, Volume2, VolumeX } from "lucide-react";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

interface AudioPlayerProps {
  audioUrl: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: string) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  className,
  size = "sm",
  onPlay,
  onPause,
  onError,
}) => {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);

  // Styled by the player stylesheet (.tp-audio-player), so the button looks
  // the same wherever the player runs, including SCORM exports.
  const sizeClasses = {
    sm: "tp-audio-player__button--sm",
    md: "tp-audio-player__button--md",
    lg: "tp-audio-player__button--lg",
  } as const;

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  } as const;

  const handlePlay = async () => {
    if (!audioRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to play audio";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  };

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlayEvent = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePauseEvent = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEndedEvent = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      const errorMessage = "Failed to load audio";
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    };

    audio.addEventListener("play", handlePlayEvent);
    audio.addEventListener("pause", handlePauseEvent);
    audio.addEventListener("ended", handleEndedEvent);
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlayEvent);
      audio.removeEventListener("pause", handlePauseEvent);
      audio.removeEventListener("ended", handleEndedEvent);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [onPlay, onPause, onError]);

  const buttonBaseClasses = "tp-audio-player__button";

  if (error) {
    return (
      <button
        type="button"
        className={cn(
          buttonBaseClasses,
          sizeClasses[size],
          "tp-audio-player__button--error",
          className,
        )}
        disabled
      >
        <VolumeX size={iconSizes[size]} />
      </button>
    );
  }

  return (
    <div className={cn("tp-audio-player", className)}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <button
        type="button"
        className={cn(buttonBaseClasses, sizeClasses[size])}
        onClick={handlePlay}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2
            size={iconSizes[size]}
            className="tp-audio-player__spinner"
          />
        ) : isPlaying ? (
          <Pause size={iconSizes[size]} />
        ) : (
          <Play size={iconSizes[size]} />
        )}
      </button>

      {size !== "sm" && (
        <button
          type="button"
          className={cn(buttonBaseClasses, sizeClasses[size])}
          onClick={handleToggleMute}
        >
          {isMuted ? (
            <VolumeX size={iconSizes[size]} />
          ) : (
            <Volume2 size={iconSizes[size]} />
          )}
        </button>
      )}
    </div>
  );
};
