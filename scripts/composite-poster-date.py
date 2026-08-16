"""Composite top-left date/venue block from poster 1 onto poster 2."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ASSETS = Path(
    r"C:\Users\jeanp\.cursor\projects\c-Users-jeanp-sci-fi-archive\assets"
)
IMG1 = ASSETS / (
    "c__Users_jeanp_AppData_Roaming_Cursor_User_workspaceStorage_f425decfb1fc029103dbc9ce7415d769_"
    "images_KakaoTalk_20260814_234412930_03-22d00ee8-1eb8-4681-855c-f63abc2d7396.png"
)
IMG2 = ASSETS / (
    "c__Users_jeanp_AppData_Roaming_Cursor_User_workspaceStorage_f425decfb1fc029103dbc9ce7415d769_"
    "images_KakaoTalk_20260814_203020846_03-af991176-ca18-4f15-abb8-08dd0c48a1ea.png"
)
OUT = ASSETS / "nnl-poster-composited.png"

SRC_BOX = (28, 48, 360, 292)
TARGET_LEFT = 44
TARGET_TOP = 52
FEATHER = 14


def feather_mask(size: tuple[int, int], radius: int) -> Image.Image:
    w, h = size
    mask = Image.new("L", size, 255)
    draw = ImageDraw.Draw(mask)

    for i in range(radius):
        alpha = int(255 * (i / radius))
        draw.rectangle((i, i, w - i - 1, h - i - 1), outline=alpha)

    return mask.filter(ImageFilter.GaussianBlur(radius / 2))


def main() -> None:
    source_poster = Image.open(IMG1).convert("RGBA")
    base_poster = Image.open(IMG2).convert("RGBA")

    w1, w2 = source_poster.size[0], base_poster.size[0]
    sx0, sy0, sx1, sy1 = SRC_BOX
    src_w, src_h = sx1 - sx0, sy1 - sy0

    scale = w2 / w1
    target_w = round(src_w * scale)
    target_h = round(src_h * scale)

    date_block = source_poster.crop(SRC_BOX).resize((target_w, target_h), Image.Resampling.LANCZOS)
    mask = feather_mask((target_w, target_h), FEATHER)

    result = base_poster.copy()
    result.paste(date_block, (TARGET_LEFT, TARGET_TOP), mask)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    result.convert("RGB").save(OUT, quality=95)
    print(f"Saved: {OUT} ({result.size[0]}x{result.size[1]})")


if __name__ == "__main__":
    main()
