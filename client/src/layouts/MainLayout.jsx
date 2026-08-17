import {
  useEffect,
  useState,
} from "react";

import {
  Outlet,
  useLocation,
} from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function MainLayout() {
  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <div
      className="
        flex
        h-[100dvh]
        min-h-0
        w-full
        overflow-hidden
        bg-[#070b12]
        pt-[env(safe-area-inset-top)]
        pb-[env(safe-area-inset-bottom)]
        lg:pt-0
        lg:pb-0
      "
    >
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() =>
          setMobileMenuOpen(false)
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className="
            shrink-0
            pl-[env(safe-area-inset-left)]
            pr-[env(safe-area-inset-right)]
            lg:pl-0
            lg:pr-0
          "
        >
          <Header
            onMenuClick={() =>
              setMobileMenuOpen(true)
            }
          />
        </div>

        <main
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overflow-x-hidden
            p-0
            sm:p-3
            lg:p-6
            pl-[env(safe-area-inset-left)]
            pr-[env(safe-area-inset-right)]
            lg:pl-6
            lg:pr-6
          "
        >
          <div className="mx-auto min-h-full w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}