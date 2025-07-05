module dubhe::dubhe_math {
    use std::u128;
    use std::u64;

    public fun min(x: u256, y: u256): u256 {
        if (x < y) x else y
    }

    public fun safe_mul(a: u256, b: u256): u256 {
        if (a == 0 || b == 0) return 0;
        let c = a * b;
        assert!(c / a == b, 0);
        c
    }

    public fun safe_div(a: u256, b: u256): u256 {
        assert!(b != 0, 0);
        a / b
    }

    /// https://medium.com/coinmonks/math-in-solidity-part-3-percents-and-proportions-4db014e080b1
    /// calculate x * y /z with as little loss of precision as possible and avoid overflow
    public fun safe_mul_div(x: u256, y: u256, z: u256): u256 {
        if (y == z) {
            return x
        };
        if (x == z) {
            return y
        };
        let a = x / z;
        let b = x % z;
        //x = a * z + b;
        let c = y / z;
        let d = y % z;
        //y = c * z + d;
        a * c * z + a * d + b * c + b * d / z
    }

    public fun log2_down(x: u256): u8 {
        let mut x = x;
        let mut result = 0;
        if (x >> 128 > 0) {
            x = x >> 128;
            result = result + 128;
        };

        if (x >> 64 > 0) {
            x = x >> 64;
            result = result + 64;
        };

        if (x >> 32 > 0) {
            x = x >> 32;
            result = result + 32;
        };

        if (x >> 16 > 0) {
            x = x >> 16;
            result = result + 16;
        };

        if (x >> 8 > 0) {
            x = x >> 8;
            result = result + 8;
        };

        if (x >> 4 > 0) {
            x = x >> 4;
            result = result + 4;
        };

        if (x >> 2 > 0) {
            x = x >> 2;
            result = result + 2;
        };

        if (x >> 1 > 0)
            result = result + 1;

        result
    }

    public fun sqrt_down(x: u256): u256 {
        if (x == 0) return 0;

        let mut result = 1 << ((log2_down(x) >> 1) as u8);

        result = (result + x / result) >> 1;
        result = (result + x / result) >> 1;
        result = (result + x / result) >> 1;
        result = (result + x / result) >> 1;
        result = (result + x / result) >> 1;
        result = (result + x / result) >> 1;
        result = (result + x / result) >> 1;

        min(result, x / result)
    }

    /// support 18-bit precision token
    /// if token is limited release, the total capacity around e10 (almost ten billions)
    /// can avoid  sqrt(x*y) overflow, and at the same time avoid loss presicion
    public fun safe_mul_sqrt(x: u256, y: u256): u256 {
        if (x < (u128::max_value!() as u256) && y < (u128::max_value!() as u256)) {
            sqrt_down(x * y)
        } else {
            sqrt_down(x) * sqrt_down(y)
        }
    }

    public(package) fun windows(x: &vector<u256>, size: u64): vector<vector<u256>> {
        assert!(size > 0, 0);

        let length = vector::length(x);
        let mut result = vector::empty<vector<u256>>();

        let num_windows = length - size + 1;

        u64::range_do!(0, num_windows, |i| {
            let mut window = vector::empty<u256>();
            u64::range_do!(0, size, |j| {
                window.push_back(x[i + j]);
            });
            vector::push_back(&mut result, window);
        });

        result
    }
}