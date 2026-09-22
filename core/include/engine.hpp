#pragma once

#include <cstddef>
#include <cstdint>
#include <vector>

namespace mc {

struct OptionParams {
    double spot = 0.0;
    double strike = 0.0;
    double time_to_maturity = 0.0;
    double risk_free_rate = 0.0;
    double volatility = 0.0;
};

struct HistogramBucket {
    double lower_bound = 0.0;
    double upper_bound = 0.0;
    double probability = 0.0;
    double density = 0.0;
    std::uint64_t count = 0;
};

struct PricingResult {
    double call_price = 0.0;
    double put_price = 0.0;
    // Greeks are calculated for the call using central finite differences.
    double delta = 0.0;
    double gamma = 0.0;
    double vega = 0.0;
    double theta = 0.0;
    // VaR is the loss from spot to the 5th/1st percentile terminal price.
    double var_95 = 0.0;
    double var_99 = 0.0;
    std::vector<HistogramBucket> histogram;
};

/**
 * Price a European call and put with Monte Carlo geometric Brownian motion.
 *
 * The supplied seed is used to derive an independent mt19937_64 stream for
 * each OpenMP worker. The implementation uses common random numbers for the
 * finite-difference bump-and-revalue calculations.
 *
 * @param params Option and market inputs.
 * @param number_of_paths Number of Monte Carlo paths; must be positive.
 * @param histogram_bucket_count Number of terminal-price histogram buckets.
 * @param seed Base seed used to initialize per-thread random engines.
 */
PricingResult price_european_option(
    const OptionParams& params,
    std::size_t number_of_paths,
    std::size_t histogram_bucket_count = 50,
    std::uint64_t seed = 42);

} // namespace mc
