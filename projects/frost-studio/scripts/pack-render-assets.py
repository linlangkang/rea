"""Build small, content-addressed runtime assets from the preserved licensed sources.

No downloads, source removal, or color-space conversion of normal/data maps.
Pillow is an offline build helper, never a browser dependency.
"""
from pathlib import Path
from PIL import Image, ImageOps
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
aliases = {}
records = []

def save(image, logical, folder, name, *, data=False, original_jpeg=None):
    import io
    encoded = io.BytesIO()
    image.save(encoded, 'WEBP', lossless=data, quality=88, method=6)
    blob = encoded.getvalue()
    extension = 'webp'
    # Existing OpenGL JPEG normals are already compressed. Copy their exact source bytes
    # if smaller than lossless WebP; never introduce another lossy normal re-encode.
    if original_jpeg is not None and len(original_jpeg) < len(blob):
        blob = original_jpeg
        extension = 'jpg'
    digest = hashlib.sha256(blob).hexdigest()[:12]
    relative = f'{folder}/optimized/{name}.{digest}.{extension}'
    target = ROOT / 'public' / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(blob)
    aliases[logical] = relative
    if folder == 'materials':
        stem = logical.removeprefix('materials/').split('-')[0]
        provenance = f'materials/{stem}-license.json'
    elif folder == 'models':
        provenance = 'models/long-life-food/source.json'
    else:
        provenance = 'Project generated landscape; docs/SOURCES.md'
    records.append({'logical': logical, 'runtime': relative, 'bytes': len(blob), 'size': list(image.size), 'dataMap': data, 'encoding': 'Original JPEG bytes, no re-encode' if extension == 'jpg' else 'Lossless WebP' if data else 'WebP color quality 88', 'sourceManifest': provenance})

sources = ROOT / 'public/materials'
for stem in ['wood_floor', 'fabric_pattern_07', 'painted_plaster_wall', 'marble_01', 'marble012', 'leather_white']:
    color = sources / f'{stem}-Diffuse.jpg'
    if color.exists():
        image = Image.open(color).convert('RGB')
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        save(image, f'materials/{stem}-Diffuse.jpg', 'materials', f'{stem}.color')
    normal = sources / f'{stem}-nor_gl.jpg'
    dx = sources / f'{stem}-nor_dx.jpg'
    if normal.exists() or dx.exists():
        image = Image.open(normal if normal.exists() else dx).convert('RGB')
        original_size = image.size
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        if not normal.exists():
            r, g, b = image.split()
            image = Image.merge('RGB', (r, ImageOps.invert(g), b))
        # Lossless preserves the normal vectors, including the converted DirectX green channel.
        save(image, f'materials/{stem}-nor_gl.jpg', 'materials', f'{stem}.normal', data=True, original_jpeg=normal.read_bytes() if normal.exists() and image.size == original_size else None)
    rough = sources / f'{stem}-Rough.jpg'
    if rough.exists():
        size = (512, 512)
        rough_image = Image.open(rough).convert('L').resize(size, Image.Resampling.LANCZOS)
        ao = sources / f'{stem}-AO.jpg'
        ao_image = Image.open(ao).convert('L').resize(size, Image.Resampling.LANCZOS) if ao.exists() else Image.new('L', size, 255)
        # Three reads AO from R and roughness from G. B is unused for dielectric surfaces.
        packed = Image.merge('RGB', (ao_image, rough_image, Image.new('L', size, 255)))
        save(packed, f'materials/{stem}-ARM.webp', 'materials', f'{stem}.arm', data=True)

for name in ['mountain', 'coast']:
    image = Image.open(ROOT / f'public/environment/{name}.png').convert('RGB')
    save(image, f'environment/{name}.png', 'environment', name)

# Existing licensed pantry model: retain the glTF and source textures, map its requests locally.
for source in (ROOT / 'public/models/long-life-food/textures').glob('*.jpg'):
    image = Image.open(source).convert('RGB')
    is_data = '_diff_' not in source.name
    image.thumbnail((1024, 1024) if '_nor_' in source.name or not is_data else (512, 512), Image.Resampling.LANCZOS)
    logical = source.relative_to(ROOT / 'public').as_posix()
    save(image, logical, 'models', source.stem, data=is_data)

output = ROOT / 'src/scene/render-assets.json'
output.write_text(json.dumps(aliases, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
manifest = ROOT / 'public/licenses/runtime-assets.json'
manifest.write_text(json.dumps({'generated': '2026-10-21', 'sources': 'Existing CC0 manifests in public/materials and public/models; original files retained.', 'normalConvention': 'OpenGL; DirectX green inverted only where explicitly named nor_dx', 'packedChannels': 'R=AO, G=roughness, B=255 (unused)', 'files': records}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'assets': len(records), 'runtimeBytes': sum(r['bytes'] for r in records)}, ensure_ascii=False))
