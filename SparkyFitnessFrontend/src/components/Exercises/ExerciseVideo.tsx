import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { getExerciseVideoInfo } from '@workspace/shared';

interface ExerciseVideoProps {
  url: string | null | undefined;
  title: string;
  className?: string;
}

/**
 * An exercise's demonstration video: YouTube and Vimeo links play inline in a
 * privacy-enhanced, sandboxed embed; anything else is a link that opens in a
 * new tab.
 */
const ExerciseVideo = ({ url, title, className }: ExerciseVideoProps) => {
  const { t } = useTranslation();
  const video = getExerciseVideoInfo(url);
  if (!video) return null;

  return (
    <div className={className}>
      {video.embedUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
          <iframe
            src={video.embedUrl}
            title={t('exercise.video.embedTitle', {
              defaultValue: '{{name}} demonstration video',
              name: title,
            })}
            className="h-full w-full"
            allow="encrypted-media; picture-in-picture; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : null}
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {video.youtubeId
          ? t('exercise.video.openOnYouTube', 'Open on YouTube')
          : video.vimeoId
            ? t('exercise.video.openOnVimeo', 'Open on Vimeo')
            : t('exercise.video.watch', 'Watch demonstration video')}
      </a>
    </div>
  );
};

export default ExerciseVideo;
