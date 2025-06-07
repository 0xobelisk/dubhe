#[test_only]
module dubhe::math_tests {
    use std::debug;
    use dubhe::dubhe_math;

    #[test]
    public fun test_windows2()  {
        debug::print(&dubhe_math::windows(&vector[1, 2, 3, 4, 5], 2));
        debug::print(&dubhe_math::windows(&vector[1, 2, 3, 4, 5], 3));
        debug::print(&dubhe_math::windows(&vector[1, 2], 2));
    }
}