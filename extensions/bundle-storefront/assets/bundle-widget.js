/**
 * Bundle widget storefront script.
 * Fetches active bundles for the current product from the app proxy and renders
 * them. "Add bundle to cart" posts the component variants to /cart/add.js. The
 * bundle DISCOUNT is applied at checkout by the Cart Transform Function (Phase 8);
 * until then items are added at full price.
 */
(function () {
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[ch];
    });
  }

  function sendEvent(base, bundleId, type) {
    if (!bundleId) return;
    try {
      fetch(base + "/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId: bundleId, type: type }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {
      /* analytics are best-effort; never block the storefront */
    }
  }

  function renderComponent(component) {
    var img = component.imageUrl
      ? '<img class="bundle-widget__img" src="' +
        escapeHtml(component.imageUrl) +
        '" alt="" loading="lazy" />'
      : "";
    return (
      '<li class="bundle-widget__item">' +
      img +
      '<span class="bundle-widget__item-title">' +
      escapeHtml(component.title) +
      "</span>" +
      '<span class="bundle-widget__item-qty">x' +
      escapeHtml(component.quantity) +
      "</span>" +
      "</li>"
    );
  }

  function renderBundle(bundle, showSavings) {
    var items = bundle.components
      .filter(function (c) {
        return c.variantId;
      })
      .map(function (c) {
        return { id: Number(c.variantId), quantity: c.quantity };
      });

    var savings =
      showSavings && bundle.savingsLabel
        ? '<span class="bundle-widget__savings">' +
          escapeHtml(bundle.savingsLabel) +
          "</span>"
        : "";

    var addButton = items.length
      ? '<button class="bundle-widget__add" type="button" data-add-bundle data-bundle-id="' +
        escapeHtml(bundle.id) +
        '" data-items="' +
        escapeHtml(JSON.stringify(items)) +
        '">Add bundle to cart</button>'
      : "";

    return (
      '<div class="bundle-widget__bundle">' +
      '<div class="bundle-widget__bundle-head">' +
      '<span class="bundle-widget__title">' +
      escapeHtml(bundle.title) +
      "</span>" +
      savings +
      "</div>" +
      '<ul class="bundle-widget__items">' +
      bundle.components.map(renderComponent).join("") +
      "</ul>" +
      addButton +
      "</div>"
    );
  }

  async function addToCart(button, base) {
    var items;
    try {
      items = JSON.parse(button.getAttribute("data-items"));
    } catch (e) {
      return;
    }
    if (!items || !items.length) return;

    button.disabled = true;
    try {
      var res = await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ items: items }),
      });
      if (!res.ok) throw new Error("add failed");
      sendEvent(base, button.getAttribute("data-bundle-id"), "ADD_TO_CART");
      window.location.href = "/cart";
    } catch (e) {
      button.disabled = false;
    }
  }

  async function init(root) {
    var productId = root.getAttribute("data-product-id");
    var base = root.getAttribute("data-proxy-base");
    var showSavings = root.getAttribute("data-show-savings") === "true";
    var content = root.querySelector("[data-bundle-widget-content]");
    if (!productId || !base || !content) return;

    try {
      var res = await fetch(
        base + "?product_id=" + encodeURIComponent(productId),
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) throw new Error("proxy error");
      var data = await res.json();

      if (!data.bundles || !data.bundles.length) {
        root.style.display = "none";
        return;
      }

      content.innerHTML = data.bundles
        .map(function (b) {
          return renderBundle(b, showSavings);
        })
        .join("");

      data.bundles.forEach(function (b) {
        sendEvent(base, b.id, "VIEW");
      });

      content.querySelectorAll("[data-add-bundle]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          addToCart(btn, base);
        });
      });
    } catch (e) {
      root.style.display = "none";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-bundle-widget]").forEach(init);
  });
})();
