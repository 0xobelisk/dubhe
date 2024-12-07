const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {

    content: ['./src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'media', // or 'media' or 'class'
    theme: {
        extend: {
            spacing: {
                "70":"17rem",
                '78':'18rem',
                '82': '20rem',
                '90': '22rem',
                '93': '23rem',
                '97': '25rem',
                '98': '27rem',
                '99': "30rem",
                "new":"34rem",
                "new-1":"39rem",
                "100":"43rem",
                "105":"46rem",
                "106":"48rem",
            },
            colors: {
                transparent: 'transparent',
                current: 'currentColor',
                custom:{
                    DEFAULT:'#8861D1',
                    light:"#8861D1",
                    dark:"#8861D1",
                }

            },
            screens: {
                '3xl': '1700px',
            },
            fontFamily: {
                sans: ['Inter var', ...defaultTheme.fontFamily.sans],
            },

        },



    },
    plugins: [

        require('@tailwindcss/line-clamp'),
        require('tailwind-scrollbar'),
    ],
    variants: {
        scrollbar: ['rounded']
    }

}

