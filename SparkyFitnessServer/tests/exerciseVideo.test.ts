import { describe, expect, it } from 'vitest';
import {
  getExerciseVideoInfo,
  normalizeExerciseVideoUrl,
  parseYouTubeVideoId,
} from '@workspace/shared';

describe('exerciseVideo', () => {
  it('normalizes pasted links and rejects non-http schemes', () => {
    expect(normalizeExerciseVideoUrl('  ')).toBeNull();
    expect(normalizeExerciseVideoUrl(null)).toBeNull();
    expect(normalizeExerciseVideoUrl('youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'https://youtube.com/shorts/dQw4w9WgXcQ'
    );
    expect(normalizeExerciseVideoUrl('http://vimeo.com/123')).toBe(
      'http://vimeo.com/123'
    );
    expect(normalizeExerciseVideoUrl('javascript:alert(1)')).toBeUndefined();
    expect(normalizeExerciseVideoUrl('ftp://example.com/a')).toBeUndefined();
    expect(normalizeExerciseVideoUrl('not a link')).toBeUndefined();
    expect(
      normalizeExerciseVideoUrl(`https://a.com/${'x'.repeat(2050)}`)
    ).toBeUndefined();
  });

  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc'],
    ['https://youtube.com/shorts/dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ'],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ'],
  ])('reads the video id from %s', (url) => {
    expect(parseYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube or malformed ids', () => {
    expect(parseYouTubeVideoId('https://vimeo.com/123456')).toBeNull();
    expect(parseYouTubeVideoId('https://youtube.com/watch?v=short')).toBeNull();
    expect(parseYouTubeVideoId('https://youtube.com/@channel')).toBeNull();
    expect(
      parseYouTubeVideoId('https://evil-youtube.com/watch?v=dQw4w9WgXcQ')
    ).toBeNull();
    expect(parseYouTubeVideoId('')).toBeNull();
  });

  it('builds embed and thumbnail URLs for YouTube, keeping the start time', () => {
    expect(
      getExerciseVideoInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m5s')
    ).toEqual({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m5s',
      youtubeId: 'dQw4w9WgXcQ',
      vimeoId: null,
      embedUrl:
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&start=65',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
  });

  it('keeps other links as plain links and ignores empty values', () => {
    expect(getExerciseVideoInfo('https://example.com/squat.mp4')).toEqual({
      url: 'https://example.com/squat.mp4',
      youtubeId: null,
      vimeoId: null,
      embedUrl: null,
      thumbnailUrl: null,
    });
    expect(getExerciseVideoInfo(null)).toBeNull();
    expect(getExerciseVideoInfo('nope')).toBeNull();
  });

  it('rejects links that hide their real host behind credentials', () => {
    expect(
      normalizeExerciseVideoUrl('https://youtube.com@evil.example/watch')
    ).toBeUndefined();
    expect(
      normalizeExerciseVideoUrl('https://user:pass@vimeo.com/76979871')
    ).toBeUndefined();
    expect(getExerciseVideoInfo('https://youtube.com@evil.example')).toBeNull();
  });

  it('rejects script and data schemes', () => {
    for (const raw of [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
    ]) {
      expect(normalizeExerciseVideoUrl(raw)).toBeUndefined();
      expect(getExerciseVideoInfo(raw)).toBeNull();
    }
  });

  it('only embeds allowlisted hosts', () => {
    for (const raw of [
      'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
      'https://evilyoutube.com/watch?v=dQw4w9WgXcQ',
      'https://vimeo.com.evil.example/76979871',
      'https://example.com/embed/dQw4w9WgXcQ',
      'https://vimeo.com/channels/staffpicks',
    ]) {
      const info = getExerciseVideoInfo(raw);
      expect(info?.embedUrl).toBeNull();
      expect(info?.youtubeId).toBeNull();
      expect(info?.vimeoId).toBeNull();
    }
  });

  it('rebuilds embeds from the id, dropping autoplay and other parameters', () => {
    const yt = getExerciseVideoInfo(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&autoplay=1&onload=alert(1)&t=30'
    );
    expect(yt?.embedUrl).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&start=30'
    );
    const vimeo = getExerciseVideoInfo(
      'https://vimeo.com/76979871?autoplay=1&background=1'
    );
    expect(vimeo?.vimeoId).toBe('76979871');
    expect(vimeo?.embedUrl).toBe(
      'https://player.vimeo.com/video/76979871?dnt=1'
    );
    expect(
      getExerciseVideoInfo('https://player.vimeo.com/video/76979871')?.vimeoId
    ).toBe('76979871');
  });
});
