#include "engine.hpp"

#include <algorithm>
#include <cmath>
#include <limits>
#include <random>
#include <stdexcept>

#ifdef _OPENMP
#include <omp.h>
#endif

namespace mc {
namespace {

constexpr double kMinimumTime = 1.0e-12;
constexpr double kMinimumVolatility = 1.0e-12;
constexpr double kOneDay = 1.0 / 365.0;

struct PayoffSums {
    double call = 0.0;
    double put = 0.0;
    double call_spot_up = 0.0;
    double call_spot_down = 0.0;
    double call_time_up = 0.0;
    double call_time_down = 0.0;
    double call_vol_up = 0.0;
    double call_vol_down = 0.0;
};

std::uint64_t splitmix64(std::uint64_t value) {
    value += 0x9e3779b97f4a7c15ULL;
    value = (value ^ (value >> 30U)) * 0xbf58476d1ce4e5b9ULL;
    value = (value ^ (value >> 27U)) * 0x94d049bb133111ebULL;
    return value ^ (value >> 31U);
}

double discounted_call_payoff(double terminal_spot, double strike, double rate, double time) {
    return std::exp(-rate * time) * std::max(terminal_spot - strike, 0.0);
}

double discounted_put_payoff(double terminal_spot, double strike, double rate, double time) {
    return std::exp(-rate * time) * std::max(strike - terminal_spot, 0.0);
}

double terminal_spot(double spot, double rate, double volatility, double time, double normal) {
    const double drift = (rate - 0.5 * volatility * volatility) * time;
    const double diffusion = volatility * std::sqrt(time) * normal;
    return spot * std::exp(drift + diffusion);
}

double percentile(std::vector<double>& sorted_values, double quantile) {
    if (sorted_values.empty()) {
        return 0.0;
    }

    const double position = quantile * static_cast<double>(sorted_values.size() - 1);
    const auto lower_index = static_cast<std::size_t>(std::floor(position));
    const auto upper_index = static_cast<std::size_t>(std::ceil(position));
    const double fraction = position - static_cast<double>(lower_index);
    return sorted_values[lower_index] +
           fraction * (sorted_values[upper_index] - sorted_values[lower_index]);
}

void validate(const OptionParams& params, std::size_t number_of_paths,
              std::size_t histogram_bucket_count) {
    if (!std::isfinite(params.spot) || params.spot <= 0.0 ||
        !std::isfinite(params.strike) || params.strike <= 0.0 ||
        !std::isfinite(params.time_to_maturity) || params.time_to_maturity <= 0.0 ||
        !std::isfinite(params.risk_free_rate) ||
        !std::isfinite(params.volatility) || params.volatility <= 0.0) {
        throw std::invalid_argument(
            "spot, strike, time_to_maturity, and volatility must be positive finite values; "
            "risk_free_rate must be finite");
    }
    if (number_of_paths == 0) {
        throw std::invalid_argument("number_of_paths must be positive");
    }
    if (histogram_bucket_count == 0) {
        throw std::invalid_argument("histogram_bucket_count must be positive");
    }
}

} // namespace

PricingResult price_european_option(const OptionParams& params,
                                    std::size_t number_of_paths,
                                    std::size_t histogram_bucket_count,
                                    std::uint64_t seed) {
    validate(params, number_of_paths, histogram_bucket_count);

    const double spot_bump = 0.01 * params.spot;
    const double time_bump = std::min(kOneDay, 0.5 * params.time_to_maturity);
    const double volatility_bump = std::max(0.0001, 0.01 * params.volatility);
    const double spot_up = params.spot + spot_bump;
    const double spot_down = params.spot - spot_bump;
    const double time_up = params.time_to_maturity + time_bump;
    const double time_down = params.time_to_maturity - time_bump;
    const double volatility_up = params.volatility + volatility_bump;
    const double volatility_down =
        std::max(kMinimumVolatility, params.volatility - volatility_bump);

    std::vector<double> terminal_spots(number_of_paths);
    double call_sum = 0.0;
    double put_sum = 0.0;
    double call_spot_up_sum = 0.0;
    double call_spot_down_sum = 0.0;
    double call_time_up_sum = 0.0;
    double call_time_down_sum = 0.0;
    double call_vol_up_sum = 0.0;
    double call_vol_down_sum = 0.0;

#pragma omp parallel reduction(+ : call_sum, put_sum, call_spot_up_sum, call_spot_down_sum, \
                               call_time_up_sum, call_time_down_sum, call_vol_up_sum, \
                               call_vol_down_sum)
    {
#ifdef _OPENMP
        const int thread_id = omp_get_thread_num();
#else
        const int thread_id = 0;
#endif
        std::mt19937_64 generator(splitmix64(seed + static_cast<std::uint64_t>(thread_id)));
        std::normal_distribution<double> standard_normal(0.0, 1.0);
        PayoffSums sums;

#pragma omp for schedule(static)
        for (std::int64_t path = 0; path < static_cast<std::int64_t>(number_of_paths); ++path) {
            const double normal = standard_normal(generator);
            const auto path_index = static_cast<std::size_t>(path);
            const double base_terminal = terminal_spot(
                params.spot, params.risk_free_rate, params.volatility,
                params.time_to_maturity, normal);
            terminal_spots[path_index] = base_terminal;

            sums.call += discounted_call_payoff(base_terminal, params.strike,
                                                params.risk_free_rate,
                                                params.time_to_maturity);
            sums.put += discounted_put_payoff(base_terminal, params.strike,
                                              params.risk_free_rate,
                                              params.time_to_maturity);

            sums.call_spot_up += discounted_call_payoff(
                terminal_spot(spot_up, params.risk_free_rate, params.volatility,
                              params.time_to_maturity, normal),
                params.strike, params.risk_free_rate, params.time_to_maturity);
            sums.call_spot_down += discounted_call_payoff(
                terminal_spot(spot_down, params.risk_free_rate, params.volatility,
                              params.time_to_maturity, normal),
                params.strike, params.risk_free_rate, params.time_to_maturity);
            sums.call_time_up += discounted_call_payoff(
                terminal_spot(params.spot, params.risk_free_rate, params.volatility,
                              time_up, normal),
                params.strike, params.risk_free_rate, time_up);
            sums.call_time_down += discounted_call_payoff(
                terminal_spot(params.spot, params.risk_free_rate, params.volatility,
                              time_down, normal),
                params.strike, params.risk_free_rate, time_down);
            sums.call_vol_up += discounted_call_payoff(
                terminal_spot(params.spot, params.risk_free_rate, volatility_up,
                              params.time_to_maturity, normal),
                params.strike, params.risk_free_rate, params.time_to_maturity);
            sums.call_vol_down += discounted_call_payoff(
                terminal_spot(params.spot, params.risk_free_rate, volatility_down,
                              params.time_to_maturity, normal),
                params.strike, params.risk_free_rate, params.time_to_maturity);
        }

        call_sum += sums.call;
        put_sum += sums.put;
        call_spot_up_sum += sums.call_spot_up;
        call_spot_down_sum += sums.call_spot_down;
        call_time_up_sum += sums.call_time_up;
        call_time_down_sum += sums.call_time_down;
        call_vol_up_sum += sums.call_vol_up;
        call_vol_down_sum += sums.call_vol_down;
    }

    const double path_count = static_cast<double>(number_of_paths);
    const double call_price = call_sum / path_count;
    const double put_price = put_sum / path_count;
    const double call_spot_up = call_spot_up_sum / path_count;
    const double call_spot_down = call_spot_down_sum / path_count;
    const double call_time_up = call_time_up_sum / path_count;
    const double call_time_down = call_time_down_sum / path_count;
    const double call_vol_up = call_vol_up_sum / path_count;
    const double call_vol_down = call_vol_down_sum / path_count;

    PricingResult result;
    result.call_price = call_price;
    result.put_price = put_price;
    result.delta = (call_spot_up - call_spot_down) / (2.0 * spot_bump);
    result.gamma = (call_spot_up - 2.0 * call_price + call_spot_down) /
                   (spot_bump * spot_bump);
    result.vega = (call_vol_up - call_vol_down) /
                 (volatility_up - volatility_down);
    result.theta = (call_time_down - call_time_up) / (time_up - time_down);

    std::sort(terminal_spots.begin(), terminal_spots.end());
    result.var_95 = std::max(0.0, params.spot - percentile(terminal_spots, 0.05));
    result.var_99 = std::max(0.0, params.spot - percentile(terminal_spots, 0.01));

    const double minimum_terminal = terminal_spots.front();
    const double maximum_terminal = terminal_spots.back();
    const double range = maximum_terminal - minimum_terminal;
    const double bucket_width = range > 0.0
                                    ? range / static_cast<double>(histogram_bucket_count)
                                    : 1.0;
    result.histogram.resize(histogram_bucket_count);

    for (std::size_t bucket = 0; bucket < histogram_bucket_count; ++bucket) {
        auto& histogram_bucket = result.histogram[bucket];
        histogram_bucket.lower_bound = minimum_terminal +
                                       static_cast<double>(bucket) * bucket_width;
        histogram_bucket.upper_bound = bucket + 1 == histogram_bucket_count
                                           ? maximum_terminal
                                           : histogram_bucket.lower_bound + bucket_width;
    }

    for (const double terminal : terminal_spots) {
        std::size_t bucket = range > 0.0
                                 ? static_cast<std::size_t>((terminal - minimum_terminal) /
                                                            bucket_width)
                                 : 0;
        bucket = std::min(bucket, histogram_bucket_count - 1);
        ++result.histogram[bucket].count;
    }

    for (auto& histogram_bucket : result.histogram) {
        histogram_bucket.probability =
            static_cast<double>(histogram_bucket.count) / path_count;
        histogram_bucket.density = histogram_bucket.probability / bucket_width;
    }

    return result;
}

} // namespace mc
