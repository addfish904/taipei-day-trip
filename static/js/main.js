import { initHomePage } from "./home.js";
import { initAttractionPage } from "./attraction.js";
import { initBookingPage } from "./booking.js";
import { initAuthPopup, initAuthStatus } from "./auth.js";

const path = window.location.pathname;
initAuthPopup();
initAuthStatus();

if (path.includes("index.html") || path === "/") {
  initHomePage();
} else if (path.includes("/attraction")) {
  initAttractionPage();
} else if (path.includes("/booking")) {
  initBookingPage();
}
