from pathlib import Path

from setuptools import setup
from pybind11.setup_helpers import Pybind11Extension, build_ext


ROOT = Path(__file__).resolve().parent

extension = Pybind11Extension(
    "quant_engine",
    sources=[
        str(ROOT / ".." / "core" / "src" / "bindings.cpp"),
        str(ROOT / ".." / "core" / "src" / "engine.cpp"),
    ],
    include_dirs=[str(ROOT / ".." / "core" / "include")],
    cxx_std=17,
    extra_compile_args=["-O3", "-fopenmp"],
    extra_link_args=["-fopenmp"],
)

setup(
    name="quant_engine",
    version="0.1.0",
    description="OpenMP Monte Carlo European option pricing engine",
    ext_modules=[extension],
    cmdclass={"build_ext": build_ext},
    zip_safe=False,
)
