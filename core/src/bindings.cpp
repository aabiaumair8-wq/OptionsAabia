#include "engine.hpp"

#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

namespace py = pybind11;

PYBIND11_MODULE(quant_engine, module) {
    module.doc() = "OpenMP Monte Carlo European option pricing engine";

    py::class_<mc::OptionParams>(module, "OptionParams")
        .def(py::init<>())
        .def_readwrite("spot", &mc::OptionParams::spot)
        .def_readwrite("strike", &mc::OptionParams::strike)
        .def_readwrite("time_to_maturity", &mc::OptionParams::time_to_maturity)
        .def_readwrite("risk_free_rate", &mc::OptionParams::risk_free_rate)
        .def_readwrite("volatility", &mc::OptionParams::volatility);

    py::class_<mc::HistogramBucket>(module, "HistogramBucket")
        .def(py::init<>())
        .def_readwrite("lower_bound", &mc::HistogramBucket::lower_bound)
        .def_readwrite("upper_bound", &mc::HistogramBucket::upper_bound)
        .def_readwrite("probability", &mc::HistogramBucket::probability)
        .def_readwrite("density", &mc::HistogramBucket::density)
        .def_readwrite("count", &mc::HistogramBucket::count);

    py::class_<mc::PricingResult>(module, "PricingResult")
        .def(py::init<>())
        .def_readwrite("call_price", &mc::PricingResult::call_price)
        .def_readwrite("put_price", &mc::PricingResult::put_price)
        .def_readwrite("delta", &mc::PricingResult::delta)
        .def_readwrite("gamma", &mc::PricingResult::gamma)
        .def_readwrite("vega", &mc::PricingResult::vega)
        .def_readwrite("theta", &mc::PricingResult::theta)
        .def_readwrite("var_95", &mc::PricingResult::var_95)
        .def_readwrite("var_99", &mc::PricingResult::var_99)
        .def_readwrite("histogram", &mc::PricingResult::histogram);

    module.def("price_european_option", &mc::price_european_option,
               py::arg("params"), py::arg("number_of_paths"),
               py::arg("histogram_bucket_count") = 50, py::arg("seed") = 42,
               "Price a European option with Monte Carlo geometric Brownian motion.");
}
