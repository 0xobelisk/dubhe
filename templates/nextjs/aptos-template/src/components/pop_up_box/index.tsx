import { useAtom } from 'jotai';
import React, { Fragment, useEffect } from 'react';
import Link from 'next/link';
import { Dialog, Transition } from '@headlessui/react';
import { OpenBoxState, SellPopUpBoxState, SellState } from '../../jotai';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Right side popup box
const PopUpBox = () => {
  const [pop_up_boxState, setSop_up_boxState] = useAtom(SellPopUpBoxState);
  const [pop_up_boxData] = useAtom(SellState);
  let time;
  useEffect(() => {
    clearTimeout(time);
    if (pop_up_boxState) {
      time = setTimeout(() => {
        setSop_up_boxState(false);
      }, 6000);
    }
    const Pop_up_box = document.getElementById('Pop_up_box');
    Pop_up_box.onmouseover = function () {
      clearInterval(time);
    };
    Pop_up_box.onmouseout = function () {
      time = setTimeout(() => {
        setSop_up_boxState(false);
      }, 3000);
    };
  }, [pop_up_boxState]);
  return (
    <div
      id="Pop_up_box"
      aria-live="assertive"
      className="pointer-events-none z-50 fixed inset-0 top-12 flex items-end px-4 py-6 sm:items-start sm:p-6 "
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {/* Notification panel, dynamically insert this into the live region when it needs to be displayed */}
        <Transition
          show={pop_up_boxState}
          as={Fragment}
          enter="transform ease-out duration-300 transition"
          enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
          enterTo="translate-y-0 opacity-100 sm:translate-x-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className={classNames(
              pop_up_boxData.state ? 'bg-green-50' : 'bg-red-50',
              'pointer-events-auto w-full max-w-xs overflow-hidden rounded-lg  ',
            )}
          >
            <div className="p-4">
              <div className="flex items-center">
                <img className={pop_up_boxData.state ? 'w-10  mt-1' : 'hidden'} src="/successful.svg" alt="" />
                <img className={pop_up_boxData.state ? 'hidden' : 'w-10  mt-1'} src="/fail.svg" alt="" />
                <div className="ml-3 w-0 flex-1 pt-0.5 text-white text-sm">
                  <p
                    className={classNames(
                      pop_up_boxData.state ? 'text-green-800' : 'text-red-800',
                      'text-sm font-medium ',
                    )}
                  >
                    {pop_up_boxData.type} {classNames(pop_up_boxData.state ? 'success' : 'fail')}
                  </p>
                  <p className={pop_up_boxData.state ? 'hidden' : 'mt-1 text-red-800 font-black'}>Please try again</p>
                  <div className={pop_up_boxData.hash == '' ? 'hidden' : ''}>
                    <Link
                      legacyBehavior
                      href={`https://explorer.sui.io/transaction/${pop_up_boxData.hash}?network=https%3A%2F%2Fwallet-rpc.devnet.sui.io%2F`}
                      target="_Blank"
                    >
                      <a
                        className={classNames(
                          pop_up_boxData.state
                            ? 'bg-green-50 text-green-500 hover:bg-green-100'
                            : 'bg-red-50 text-red-500 hover:bg-red-100',
                          'mt-1 underline font-semibold ',
                        )}
                        target="_Blank"
                      >
                        View on Explorer
                      </a>
                    </Link>
                  </div>
                </div>

                <div className="-mt-4 flex flex-shrink-0">
                  <button
                    type="button"
                    className={classNames(
                      pop_up_boxData.state
                        ? 'bg-green-50 text-green-500 hover:bg-green-100'
                        : 'bg-red-50 text-red-500 hover:bg-red-100',
                      'inline-flex rounded-md  p-1.5',
                    )}
                    onClick={() => {
                      setSop_up_boxState(false);
                    }}
                  >
                    <i className="fa fa-times" aria-hidden="true"></i>
                    <span className="sr-only">Close</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  );
};

// Loading popup box
const Loading = () => {
  const [openLoading, setOpenLoading] = useAtom(OpenBoxState);
  return (
    <>
      <Transition.Root show={openLoading} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => false}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-400 bg-opacity-50 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center  justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="">
                  <div className="animate-spin text-white">
                    <i className="fa fa-spinner f-spin fa-2x fa-fw"></i>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
};
export { PopUpBox, Loading };
