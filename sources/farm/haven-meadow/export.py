"""Export the meadow factories in a dedicated background Blender process."""
import bpy
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def export(destination):
    if not bpy.app.background:
        raise RuntimeError('Run in a dedicated background process to preserve the open scene.')
    destination.mkdir(parents=True, exist_ok=True)
    geometry = load('bw_meadow_geometry', 'geometry.py')
    assets = load('bw_meadow_assets', 'assets.py')
    original = bpy.context.window.scene
    material = geometry.vertex_material()
    try:
        for name, factory in assets.FACTORIES.items():
            scene = bpy.data.scenes.new('Haven meadow ' + name)
            for suffix, mesh, pivot in factory():
                obj = mesh.object(name + '_' + suffix, scene.collection, material)
                if pivot:
                    obj.location = pivot
                if suffix == 'sails':
                    obj['bwMotion'] = {'kind': 'spin', 'axis': 'z', 'speed': .32}
                elif suffix == 'kite':
                    obj['bwMotion'] = {'kind': 'sway', 'axis': 'z', 'amplitude': .085, 'speed': 1.3}
            scene.view_layers[0].update()
            bpy.context.window.scene = scene
            bpy.ops.export_scene.gltf(
                filepath=str(destination / (name + '.glb')), export_format='GLB',
                use_active_scene=True, export_yup=True, export_cameras=False,
                export_lights=False, export_extras=True, export_apply=True,
                export_animations=False)
    finally:
        bpy.context.window.scene = original


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if len(args) != 1:
        raise SystemExit('Usage: blender --background --factory-startup --python export.py -- OUTPUT_DIRECTORY')
    export(Path(args[0]).resolve())
