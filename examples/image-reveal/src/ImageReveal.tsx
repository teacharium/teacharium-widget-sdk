import type { PuckComponent } from "@measured/puck";
import type {
  TeachariumComponentConfig,
  TeachariumWidgetApi,
} from "@teacharium/widget";

export interface ImageRevealProps {
  api: TeachariumWidgetApi;
  /** "media:<id>" reference to an image in the lesson's media library. */
  image: string;
  alt: string;
  prompt: string;
  caption: string;
}

const ImageReveal: PuckComponent<ImageRevealProps> = ({
  api,
  image,
  alt,
  prompt,
  caption,
}) => {
  // Library images are stored as references; resolve them to a URL through
  // the host (signed URLs in Teacharium, packaged files in SCORM exports).
  const { data: url, isLoading } = api.hooks.useResolvedMediaUrl(
    image || undefined,
  );
  const [revealed, setRevealed] = api.hooks.useWidgetState("revealed", false);

  // Authors and reviewers always see the image.
  const visible = revealed || api.isEditing || api.isReviewMode;

  if (!image) {
    return <div className="example-reveal__empty">Choose an image.</div>;
  }

  return (
    <figure className="example-reveal">
      <div className="example-reveal__frame">
        {isLoading || !url ? (
          <div className="example-reveal__empty">Loading image…</div>
        ) : (
          <img
            src={url}
            alt={alt}
            className={
              visible
                ? "example-reveal__image"
                : "example-reveal__image example-reveal__image--hidden"
            }
          />
        )}
        {!visible && (
          <button
            type="button"
            className="example-reveal__button"
            onClick={() => setRevealed(true)}
          >
            {prompt}
          </button>
        )}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
};

export const ImageRevealConfig: TeachariumComponentConfig<ImageRevealProps> = {
  usagePrompt: "An image hidden until the learner reveals it.",
  render: ImageReveal,
  fields: {
    image: { type: "imageMedia", label: "Image" },
    alt: { type: "text", label: "Alt text" },
    prompt: { type: "text", label: "Button text" },
    caption: { type: "textarea", label: "Caption" },
  },
  defaultProps: {
    image: "",
    alt: "",
    prompt: "Reveal the image",
    caption: "",
  },
};
