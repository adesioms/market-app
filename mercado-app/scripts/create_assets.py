from pathlib import Path
from PIL import Image, ImageDraw

ASSET_DIR = Path(__file__).resolve().parent.parent / "assets"
ASSET_DIR.mkdir(parents=True, exist_ok=True)

BACKGROUND = "#0f0f1a"
ACCENT = "#38bdf8"
WHITE = "#f8fafc"


def draw_basket(draw: ImageDraw.ImageDraw, center_x: int, center_y: int, scale: float, color: str) -> None:
    width = int(460 * scale)
    height = int(300 * scale)
    left = center_x - width // 2
    top = center_y - height // 2 + int(65 * scale)
    radius = int(36 * scale)
    line = int(30 * scale)

    draw.rounded_rectangle((left, top, left + width, top + height), radius=radius, outline=color, width=line)
    handle_top = top - int(155 * scale)
    handle_left = center_x - int(155 * scale)
    handle_right = center_x + int(155 * scale)
    draw.arc((handle_left, handle_top, handle_right, top + int(90 * scale)), start=190, end=350, fill=color, width=line)

    for x_factor in (-0.22, 0, 0.22):
        x = center_x + int(width * x_factor)
        draw.line((x, top + int(62 * scale), x, top + height - int(60 * scale)), fill=color, width=int(20 * scale))


def app_icon() -> Image.Image:
    image = Image.new("RGBA", (1024, 1024), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.ellipse((112, 112, 912, 912), fill=ACCENT)
    draw_basket(draw, 512, 495, 1.25, WHITE)
    return image


def adaptive_foreground() -> Image.Image:
    image = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw_basket(draw, 512, 500, 1.35, WHITE)
    return image


def splash_image() -> Image.Image:
    image = Image.new("RGBA", (1284, 2778), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.ellipse((262, 1009, 1022, 1769), fill=ACCENT)
    draw_basket(draw, 642, 1370, 1.2, WHITE)
    return image


app_icon().save(ASSET_DIR / "icon.png")
adaptive_foreground().save(ASSET_DIR / "adaptive-icon.png")
splash_image().save(ASSET_DIR / "splash.png")
app_icon().resize((48, 48), Image.Resampling.LANCZOS).save(ASSET_DIR / "favicon.png")
print(f"Recursos criados em {ASSET_DIR}")
