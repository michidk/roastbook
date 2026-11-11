# Explicit picture beautification

Approved in conversation: remove the upload toggle and automatic edits on
upload or main-image selection. Each eligible picture has an explicit
**Beautify with AI** action. Explain that it creates a new main image, keeps
the original, uses the configured AI provider, and runs while the app is open.

Use a tooltip and visible help in the full-size viewer. Show a picture spinner
and one Sonner notification that changes from loading to success or failure.
Allow navigation and unrelated uploads while editing. Prevent duplicate edits
of the same picture. Keep the Beautified badge and hide the action on edited
copies and originals with a copy. Failures allow retry.

## Approaches

- Chosen: explicit action, shared in-memory status, and Sonner feedback using
  the existing request. No progress percentage because the provider sends none.
- Automatic editing in settings would retain implicit paid actions; defer it.
- Durable jobs with polling would survive reloads but require a separate job
  lifecycle. This change promises navigation within the app, not tab closure.

Keep legacy database settings for compatibility. Ignore automatic requests
from old clients, even when their saved preference was enabled.
