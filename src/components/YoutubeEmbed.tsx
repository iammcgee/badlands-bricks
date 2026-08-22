export function YoutubeEmbed({
  url,
  title = "MOC video",
}: {
  url: string;
  title?: string;
}) {
  // Lazy import avoided — pass embed URL from server via youtubeEmbedUrl.
  return (
    <div className="aspect-video w-full overflow-hidden bg-neutral-900">
      <iframe
        src={url}
        title={title}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
