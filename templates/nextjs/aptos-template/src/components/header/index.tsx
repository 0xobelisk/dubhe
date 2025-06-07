import Link from 'next/link';
import { useState } from 'react';
import { Popover } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import * as React from 'react';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function MenuIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M5 6h14M5 18h14M5 12h14" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronUpIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M17 14l-5-5-5 5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const Header = () => {
  const [scroll, setScroll] = useState(false);
  const navigation = [
    { name: 'Test1', href: '#test1' },
    { name: 'Test2', href: '#test2' },
    { name: 'Test3', href: '#test3' },
    // {name:"TEAM", href:"#team"},
  ];

  if (typeof window !== 'undefined') {
    window.onscroll = function () {
      myFunction();
    };
  }

  function myFunction() {
    if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
      setScroll(true);
    } else {
      setScroll(false);
    }
  }
  const to = toEl => {
    let bridge = document.querySelector(toEl);
    let body = document.body;
    let height = 0;
    do {
      height += bridge.offsetTop;
      bridge = bridge.offsetParent;
    } while (bridge !== body);

    window.scrollTo({
      top: height,
      behavior: 'smooth',
    });
  };
  return (
    <div
      className={classNames(
        scroll ? 'p-3 backdrop-blur-sm bg-[#2E2E2E]/80' : 'py-4 ',
        'flex fixed mx-auto z-40 inset-x-0 px-4 sm:px-6 lg:px-8 xl:px-24 2xl:px-56  w-full justify-between transition-all duration-700 ease-in-out  items-center',
      )}
    >
      <div className={'relative z-10 items-center flex '}>
        <Link href="/" legacyBehavior>
          <a>
            <img className="w-10 h-10 rounded-full flex lg:mr-5" src="/logo.svg" alt="" />
          </a>
        </Link>
        <div className="hidden lg:flex lg:gap-10">
          {navigation.map(item => (
            <button
              key={item.name}
              onClick={() => {
                to(item.href);
              }}
              className="text-sm lg:text-base font-medium text-white transition duration-700 "
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center  gap-6">
        <Popover className="lg:hidden">
          {({ open }) => (
            <>
              <Popover.Button
                className="relative z-10 -m-2 inline-flex items-center rounded-lg stroke-gray-500 p-2 outline-none"
                aria-label="Toggle site navigation"
              >
                {({ open }) => (open ? <ChevronUpIcon className="h-10 w-10" /> : <MenuIcon className="h-10 w-10" />)}
              </Popover.Button>
              <AnimatePresence initial={false}>
                {open && (
                  <>
                    <Popover.Overlay
                      static
                      as={motion.div}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-0 bg-gray-300/60 backdrop-blur"
                    />
                    <Popover.Panel
                      static
                      as={motion.div}
                      initial={{ opacity: 0, y: -32 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{
                        opacity: 0,
                        y: -32,
                        transition: { duration: 0.2 },
                      }}
                      className="absolute inset-x-0 top-0 z-0 origin-top rounded-b-2xl  bg-[#2E2E2E] px-6 pb-6 pt-24 shadow-2xl shadow-gray-900/20"
                    >
                      <div className="space-y-4 ">
                        {navigation.map(item => (
                          <button
                            key={item.name}
                            onClick={() => to(item.href)}
                            className="block text-base leading-7 tracking-tight text-white"
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </Popover.Panel>
                  </>
                )}
              </AnimatePresence>
            </>
          )}
        </Popover>

        <div className="hidden lg:flex gap-4 items-center ">
          <Link href="https://discord.gg/ceETxS2eTa" legacyBehavior>
            <a target="_blank">
              <img className="w-6 " src="discord.svg" alt="" />
            </a>
          </Link>
          <Link href="https://twitter.com/suirobots" legacyBehavior>
            <a target="_blank">
              <img className="w-6" src="twitter.svg" alt="" />
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Header;
