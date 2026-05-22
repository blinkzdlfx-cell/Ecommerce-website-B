const DEFAULT_CURRENCY = "NGN";
const MAX_ADMIN_RESULTS = 150;
const DEFAULT_FIREBASE_PROJECT_ID = "beulah-foods-online-store";
const PRODUCT_CACHE_TTL_MS = 30 * 1000;
const MAX_PRODUCT_IMAGE_DATA_URL_LENGTH = 550000;
const MAX_ANNOUNCEMENTS_PUBLIC = 5;
const MAX_BLOG_POSTS_PUBLIC = 30;
const DEFAULT_SITE_EXPERIENCE = Object.freeze({
  sessionMode: "lock_after_inactivity",
  inactivityMinutes: 5,
  modalEnabled: false,
  modalTitle: "",
  modalMessage: "",
  modalImage: "",
  modalButtonLabel: "",
  modalButtonUrl: "",
  createdAt: "",
  updatedAt: ""
});

const FALLBACK_PRODUCT_CATALOG = Object.freeze({
  "plantain-flour": {
    id: "plantain-flour",
    name: "Plantain Flour",
    description: "Sun-dried premium plantains, milled fresh.",
    price: 5000,
    image: "images/plantain-flour.jpg",
    active: true
  },
  "rice-flour": {
    id: "rice-flour",
    name: "Rice Flour",
    description: "Smooth local rice flour. Gluten-free and versatile.",
    price: 4000,
    image: "images/rice-flour.jpg",
    active: true
  },
  "guinea-corn-flour": {
    id: "guinea-corn-flour",
    name: "Guinea Corn Flour",
    description: "Stone-ground guinea corn flour with rich nutrients.",
    price: 3500,
    image: "images/guinea-corn-flour.jpg",
    active: true
  },
  "iru-ekiti-125g": {
    id: "iru-ekiti-125g",
    name: "Iru Ekiti (125g)",
    description: "Traditional fermented locust beans from Ekiti.",
    price: 5000,
    image: "images/iru-ekiti-125g.jpg",
    active: true
  },
  "iru-ekiti-500g": {
    id: "iru-ekiti-500g",
    name: "Iru Ekiti (500g)",
    description: "Large pack of authentic fermented locust beans.",
    price: 10000,
    image: "images/iru-ekiti-500g.jpg",
    active: true
  }
});

let cachedCatalog = {
  expiresAt: 0,
  products: []
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);

    try {
      if (request.method === "OPTIONS") {
        return withCors(new Response(null, { status: 204 }), request, env);
      }

      if (path === "/health") {
        return json(
          request,
          env,
          { ok: true, service: "beulah-payments-worker", date: new Date().toISOString() },
          200
        );
      }

      if (path === "/paystackWebhook" && request.method === "POST") {
        return await handlePaystackWebhook(request, env);
      }

      if (path === "/listProducts" && request.method === "GET") {
        return await listProducts(request, env);
      }

      if (path === "/listAnnouncements" && request.method === "GET") {
        return await listAnnouncements(request, env);
      }

      if (path === "/listBlogPosts" && request.method === "GET") {
        return await listBlogPosts(request, env);
      }

      if (path === "/getBlogPost" && request.method === "GET") {
        return await getBlogPost(request, env, url);
      }

      if (path === "/getSiteExperience" && request.method === "GET") {
        return await getSiteExperience(request, env);
      }

      if (request.method !== "POST") {
        throw new HttpError(405, "Method not allowed.");
      }

      if (path === "/createCheckoutSession") {
        return await withAuth(request, env, createCheckoutSession);
      }

      if (path === "/previewCheckout") {
        return await withAuth(request, env, previewCheckout);
      }

      if (path === "/confirmCheckoutPayment") {
        return await withAuth(request, env, confirmCheckoutPayment);
      }

      if (path === "/getOrderStatus") {
        return await withAuth(request, env, getOrderStatus);
      }

      if (path === "/listMyOrders") {
        return await withAuth(request, env, listMyOrders);
      }

      if (path === "/adminListOrders") {
        return await withAuth(request, env, adminListOrders);
      }

      if (path === "/adminListProducts") {
        return await withAuth(request, env, adminListProducts);
      }

      if (path === "/adminUpsertProduct") {
        return await withAuth(request, env, adminUpsertProduct);
      }

      if (path === "/adminSetProductActive") {
        return await withAuth(request, env, adminSetProductActive);
      }

      if (path === "/adminDeleteProduct") {
        return await withAuth(request, env, adminDeleteProduct);
      }

      if (path === "/adminDeleteAllProducts") {
        return await withAuth(request, env, adminDeleteAllProducts);
      }

      if (path === "/adminSeedDefaultProducts") {
        return await withAuth(request, env, adminSeedDefaultProducts);
      }

      if (path === "/adminListAnnouncements") {
        return await withAuth(request, env, adminListAnnouncements);
      }

      if (path === "/adminUpsertAnnouncement") {
        return await withAuth(request, env, adminUpsertAnnouncement);
      }

      if (path === "/adminDeleteAnnouncement") {
        return await withAuth(request, env, adminDeleteAnnouncement);
      }

      if (path === "/adminListCoupons") {
        return await withAuth(request, env, adminListCoupons);
      }

      if (path === "/adminUpsertCoupon") {
        return await withAuth(request, env, adminUpsertCoupon);
      }

      if (path === "/adminDeleteCoupon") {
        return await withAuth(request, env, adminDeleteCoupon);
      }

      if (path === "/adminGetSiteExperience") {
        return await withAuth(request, env, adminGetSiteExperience);
      }

      if (path === "/adminUpsertSiteExperience") {
        return await withAuth(request, env, adminUpsertSiteExperience);
      }

      if (path === "/adminDeleteSiteExperience") {
        return await withAuth(request, env, adminDeleteSiteExperience);
      }

      if (path === "/adminListBlogPosts") {
        return await withAuth(request, env, adminListBlogPosts);
      }

      if (path === "/adminUpsertBlogPost") {
        return await withAuth(request, env, adminUpsertBlogPost);
      }

      if (path === "/adminDeleteBlogPost") {
        return await withAuth(request, env, adminDeleteBlogPost);
      }

      if (path === "/bootstrapAdminAccess") {
        return await withAuth(request, env, bootstrapAdminAccess);
      }

      throw new HttpError(404, "Endpoint not found.");
    } catch (error) {
      return handleError(error, request, env);
    }
  }
};

async function withAuth(request, env, handler) {
  const user = await requireUserFromAuthHeader(request, env);
  requireVerifiedEmailUser(user);
  const body = await readJsonBody(request);
  return handler({ request, env, user, body });
}

async function createCheckoutSession({ request, env, user, body }) {
  const publicKey = getValidatedPaystackPublicKey(env);
  assertPaystackKeyModesMatch(env, publicKey);
  const cart = body?.cart;
  const items = await cartToItems(cart, env);
  const couponCode = normalizeCouponCode(body?.couponCode || "");

  if (!items.length) {
    throw new HttpError(400, "Your cart is empty.");
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const coupon = await resolveCouponForCheckout(env, couponCode, subtotal, user.idToken);
  const discount = coupon ? coupon.discount : 0;
  const total = Math.max(0, subtotal - discount);
  const amountKobo = total * 100;
  const orderRef = createOrderRef();
  const email = normalizeEmail(user.email || body?.email || "");

  if (!email) {
    throw new HttpError(400, "Signed-in account has no email.");
  }

  const metadata = {
    app: "beulah-foods",
    userId: user.uid,
    userEmail: email,
    items,
    subtotal,
    discount,
    total,
    couponCode: coupon ? coupon.code : "",
    currency: DEFAULT_CURRENCY
  };

  const initialized = await initializePaystackTransaction(env, {
    amountKobo,
    email,
    orderRef,
    metadata
  });

  return json(
    request,
    env,
    {
      orderRef: initialized.reference || orderRef,
      amountKobo,
      currency: DEFAULT_CURRENCY,
      publicKey,
      email,
      subtotal,
      discount,
      total,
      couponCode: coupon ? coupon.code : "",
      verificationReady: true
    },
    200
  );
}

async function previewCheckout({ request, env, body, user }) {
  const cart = body?.cart;
  const items = await cartToItems(cart, env);
  if (!items.length) {
    throw new HttpError(400, "Your cart is empty.");
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const couponCode = normalizeCouponCode(body?.couponCode || "");
  const coupon = await resolveCouponForCheckout(env, couponCode, subtotal, user.idToken);
  const discount = coupon ? coupon.discount : 0;
  const total = Math.max(0, subtotal - discount);

  return json(
    request,
    env,
    {
      subtotal,
      discount,
      total,
      couponCode: coupon ? coupon.code : "",
      items
    },
    200
  );
}

async function confirmCheckoutPayment({ request, env, user, body }) {
  const orderRef = cleanOrderRef(body?.orderRef);
  const transaction = await verifyPaystackTransaction(env, orderRef);
  const order = buildOrderFromTransaction(transaction);

  if (!isAdminUser(user, env) && !isOwnedOrder(order, user)) {
    throw new HttpError(403, "You can only verify your own order.");
  }

  return json(request, env, { order }, 200);
}

async function getOrderStatus({ request, env, user, body }) {
  const orderRef = cleanOrderRef(body?.orderRef);
  const transaction = await verifyPaystackTransaction(env, orderRef);
  const order = buildOrderFromTransaction(transaction);

  if (!isAdminUser(user, env) && !isOwnedOrder(order, user)) {
    throw new HttpError(403, "You can only view your own order.");
  }

  return json(request, env, { order }, 200);
}

async function listMyOrders({ request, env, user, body }) {
  const requestedLimit = Number(body?.limit || 8);
  const requestedOffset = Number(body?.offset || 0);
  const requestedMaxScanPages = Number(body?.maxScanPages || 30);

  const limit = clamp(
    Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 8,
    1,
    25
  );
  const offset = clamp(
    Number.isFinite(requestedOffset) ? Math.trunc(requestedOffset) : 0,
    0,
    5000
  );
  const maxScanPages = clamp(
    Number.isFinite(requestedMaxScanPages) ? Math.trunc(requestedMaxScanPages) : 30,
    1,
    120
  );

  const orders = [];
  let matchedOwned = 0;
  let hasMore = false;
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount && page <= maxScanPages) {
    const payload = await paystackRequestWithMeta(
      env,
      `/transaction?perPage=100&page=${page}`,
      { method: "GET" }
    );

    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const rawPageCount = Number(payload?.meta?.pageCount || 1);
    pageCount = Number.isFinite(rawPageCount) ? rawPageCount : 1;

    for (const row of rows) {
      const order = buildOrderFromTransaction(row);
      if (!isOwnedOrder(order, user)) {
        continue;
      }

      if (matchedOwned < offset) {
        matchedOwned += 1;
        continue;
      }

      if (orders.length < limit) {
        orders.push(order);
        matchedOwned += 1;
        continue;
      }

      hasMore = true;
      break;
    }

    if (hasMore) {
      break;
    }

    page += 1;
  }

  if (!hasMore && page > maxScanPages && page <= pageCount) {
    hasMore = true;
  }

  const summary = {
    total: offset + orders.length,
    paid: orders.filter((order) => order.paymentStatus === "paid").length,
    pending: orders.filter((order) => order.paymentStatus === "pending").length
  };

  const pagination = {
    offset,
    limit,
    nextOffset: offset + orders.length,
    hasMore
  };

  return json(request, env, { orders, summary, pagination }, 200);
}

async function adminListOrders({ request, env, user, body }) {
  requireAdminUser(user, env);

  const requestedLimit = Number(body?.limit || 120);
  const limit = clamp(
    Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 120,
    1,
    MAX_ADMIN_RESULTS
  );
  const paymentStatus = normalizeFilterStatus(body?.paymentStatus);

  const allOrders = await listPaystackOrders(env, 3);
  allOrders.sort((a, b) => {
    const left = new Date(a.createdAt || 0).getTime();
    const right = new Date(b.createdAt || 0).getTime();
    return right - left;
  });

  const summary = {
    total: allOrders.length,
    paid: allOrders.filter((order) => order.paymentStatus === "paid").length,
    pending: allOrders.filter((order) => order.paymentStatus === "pending").length
  };

  const filtered = paymentStatus === "all"
    ? allOrders
    : allOrders.filter((order) => order.paymentStatus === paymentStatus);

  return json(request, env, { orders: filtered.slice(0, limit), summary }, 200);
}

async function listProducts(request, env) {
  const products = await getCatalogProducts(env, { includeInactive: false });
  return json(request, env, { products }, 200);
}

async function adminListProducts({ request, env, user }) {
  requireAdminUser(user, env);
  const products = await getCatalogProducts(env, { includeInactive: true, forceRefresh: true });
  return json(request, env, { products }, 200);
}

async function adminUpsertProduct({ request, env, user, body }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const nowIso = new Date().toISOString();
  const normalized = normalizeProductPayload(body, nowIso);

  const existing = await getProductById(env, normalized.id).catch(() => null);
  if (existing?.createdAt) {
    normalized.createdAt = existing.createdAt;
  }

  await writeProductDocument(env, normalized.id, normalized, idToken);
  invalidateCatalogCache();

  return json(request, env, { product: normalized, saved: true }, 200);
}

async function adminSetProductActive({ request, env, user, body }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const productId = sanitizeProductDocumentId(body?.id || "");
  if (!productId) {
    throw new HttpError(400, "Product id is required.");
  }

  const active = Boolean(body?.active);
  const updatedAt = new Date().toISOString();

  const existing = await getProductById(env, productId);
  if (!existing) {
    const fallback = getFallbackProductById(productId);
    if (!fallback) {
      throw new HttpError(404, "Product not found.");
    }

    const promoted = normalizeProductRow({
      ...fallback,
      active,
      createdAt: updatedAt,
      updatedAt,
      managed: true
    });

    await writeProductDocument(env, productId, promoted, idToken);
    invalidateCatalogCache();

    return json(
      request,
      env,
      {
        product: promoted,
        saved: true
      },
      200
    );
  }

  await patchProductDocument(
    env,
    productId,
    {
      active,
      updatedAt
    },
    ["active", "updatedAt"],
    idToken
  );

  invalidateCatalogCache();

  return json(
    request,
    env,
    {
      product: {
        ...existing,
        active,
        updatedAt
      },
      saved: true
    },
    200
  );
}

async function adminDeleteProduct({ request, env, user, body }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const productId = sanitizeProductDocumentId(body?.id || "");
  if (!productId) {
    throw new HttpError(400, "Product id is required.");
  }

  const existing = await getProductById(env, productId);
  if (!existing) {
    if (isFallbackProductId(productId)) {
      throw new HttpError(
        400,
        "This default product is read-only. Click 'Import Defaults' first, then delete it."
      );
    }
    throw new HttpError(404, "Product not found.");
  }

  await deleteProductDocument(env, productId, idToken);
  invalidateCatalogCache();
  return json(request, env, { deleted: true, id: productId }, 200);
}

async function adminDeleteAllProducts({ request, env, user }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const rows = await listProductsFromFirestore(env);

  let deletedCount = 0;
  for (const row of rows) {
    const documentId = sanitizeProductDocumentId(row.documentId || row.id || "");
    if (!documentId) continue;
    await deleteProductDocument(env, documentId, idToken);
    deletedCount += 1;
  }

  invalidateCatalogCache();
  return json(request, env, { deleted: true, deletedCount }, 200);
}

async function adminSeedDefaultProducts({ request, env, user, body }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const overwrite = body?.overwrite === true;
  const nowIso = new Date().toISOString();

  const existingRows = await listProductsFromFirestore(env);
  const existingById = {};
  existingRows.forEach((row) => {
    existingById[row.id] = row;
  });

  let created = 0;
  let updated = 0;
  const fallbackRows = Object.values(FALLBACK_PRODUCT_CATALOG).map((row) =>
    normalizeProductRow({ ...row, managed: true })
  );

  for (const fallback of fallbackRows) {
    const existing = existingById[fallback.id] || null;
    if (existing && !overwrite) {
      continue;
    }

    const next = normalizeProductRow({
      ...fallback,
      managed: true,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso
    });

    await writeProductDocument(env, fallback.id, next, idToken);
    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  invalidateCatalogCache();

  return json(
    request,
    env,
    {
      seeded: true,
      created,
      updated,
      totalDefaults: fallbackRows.length
    },
    200
  );
}

async function listAnnouncements(request, env) {
  const now = Date.now();
  const rows = await listAnnouncementsFromFirestore(env);
  const activeRows = rows
    .map((row) => normalizeAnnouncementRow(row))
    .filter((row) => isAnnouncementActive(row, now))
    .sort((left, right) => sortIsoDesc(left.updatedAt, right.updatedAt))
    .slice(0, MAX_ANNOUNCEMENTS_PUBLIC);

  return json(request, env, { announcements: activeRows }, 200);
}

async function adminListAnnouncements({ request, env, user }) {
  requireAdminUser(user, env);
  const rows = await listAnnouncementsFromFirestore(env);
  rows.sort((left, right) => sortIsoDesc(left.updatedAt, right.updatedAt));
  return json(request, env, { announcements: rows }, 200);
}

async function adminUpsertAnnouncement({ request, env, user, body }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const nowIso = new Date().toISOString();
  const payload = normalizeAnnouncementPayload(body, nowIso);
  const existing = await getAnnouncementById(env, payload.id).catch(() => null);
  if (existing?.createdAt) {
    payload.createdAt = existing.createdAt;
  }

  await writeDocument(env, `announcements/${payload.id}`, payload, idToken);
  return json(request, env, { announcement: payload, saved: true }, 200);
}

async function adminDeleteAnnouncement({ request, env, user, body }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const id = sanitizeSimpleId(body?.id || "");
  if (!id) {
    throw new HttpError(400, "Announcement id is required.");
  }

  await deleteDocument(env, `announcements/${id}`, idToken);
  return json(request, env, { deleted: true, id }, 200);
}

async function adminListCoupons({ request, env, user }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const rows = await listCouponsFromFirestore(env, idToken);
  rows.sort((left, right) => sortIsoDesc(left.updatedAt, right.updatedAt));
  return json(request, env, { coupons: rows }, 200);
}

async function adminUpsertCoupon({ request, env, user, body }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const nowIso = new Date().toISOString();
  const payload = normalizeCouponPayload(body, nowIso);
  const existing = await getCouponByCode(env, payload.code, idToken).catch(() => null);
  if (existing?.createdAt) {
    payload.createdAt = existing.createdAt;
  }

  await writeDocument(env, `coupons/${payload.code}`, payload, idToken);
  return json(request, env, { coupon: payload, saved: true }, 200);
}

async function adminDeleteCoupon({ request, env, user, body }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const code = normalizeCouponCode(body?.code || "");
  if (!code) {
    throw new HttpError(400, "Coupon code is required.");
  }

  await deleteDocument(env, `coupons/${code}`, idToken);
  return json(request, env, { deleted: true, code }, 200);
}

async function getSiteExperience(request, env) {
  const settings = await getSiteExperienceSettings(env);
  return json(request, env, { settings }, 200);
}

async function adminGetSiteExperience({ request, env, user }) {
  requireAdminUser(user, env);
  const settings = await getSiteExperienceSettings(env);
  return json(request, env, { settings }, 200);
}

async function adminUpsertSiteExperience({ request, env, user, body }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const nowIso = new Date().toISOString();
  const existing = await getSiteExperienceDocument(env).catch(() => null);
  const payload = normalizeSiteExperiencePayload(
    {
      ...DEFAULT_SITE_EXPERIENCE,
      ...(existing || {}),
      ...(body && typeof body === "object" ? body : {})
    },
    existing?.createdAt || nowIso,
    nowIso
  );

  await writeDocument(env, "site_settings/experience", payload, idToken);
  return json(request, env, { settings: payload, saved: true }, 200);
}

async function adminDeleteSiteExperience({ request, env, user }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);

  try {
    await deleteDocument(env, "site_settings/experience", idToken);
  } catch (error) {
    if (!(error instanceof HttpError && error.status === 404)) {
      throw error;
    }
  }

  return json(request, env, { deleted: true, settings: { ...DEFAULT_SITE_EXPERIENCE } }, 200);
}

async function listBlogPosts(request, env) {
  const rows = await queryPublishedBlogPosts(env);
  const posts = rows
    .map((row) => normalizeBlogPostRow(row))
    .filter((row) => row.status === "published")
    .sort((left, right) => sortIsoDesc(left.publishedAt || left.updatedAt, right.publishedAt || right.updatedAt))
    .slice(0, MAX_BLOG_POSTS_PUBLIC);

  return json(request, env, { posts }, 200);
}

async function getBlogPost(request, env, url) {
  const slug = normalizeBlogSlug(url.searchParams.get("slug") || "");
  if (!slug) {
    throw new HttpError(400, "Blog slug is required.");
  }

  const row = await queryPublishedBlogPostBySlug(env, slug);
  if (!row) {
    throw new HttpError(404, "Blog post not found.");
  }

  return json(request, env, { post: normalizeBlogPostRow(row) }, 200);
}

async function adminListBlogPosts({ request, env, user }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const rows = await listBlogPostsFromFirestore(env, idToken);
  rows.sort((left, right) => sortIsoDesc(left.updatedAt, right.updatedAt));
  return json(request, env, { posts: rows }, 200);
}

async function adminUpsertBlogPost({ request, env, user, body }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const nowIso = new Date().toISOString();
  const payload = normalizeBlogPostPayload(body, nowIso);
  const existing = await getBlogPostById(env, payload.id, idToken).catch(() => null);
  if (existing?.createdAt) {
    payload.createdAt = existing.createdAt;
  }
  if (payload.status === "published" && !payload.publishedAt) {
    payload.publishedAt = existing?.publishedAt || nowIso;
  }
  if (payload.status !== "published") {
    payload.publishedAt = "";
  }

  await writeDocument(env, `blog_posts/${payload.id}`, payload, idToken);
  return json(request, env, { post: payload, saved: true }, 200);
}

async function adminDeleteBlogPost({ request, env, user, body }) {
  requireAdminUser(user, env);
  const idToken = requireIdToken(user);
  const id = sanitizeSimpleId(body?.id || "");
  if (!id) {
    throw new HttpError(400, "Blog post id is required.");
  }

  await deleteDocument(env, `blog_posts/${id}`, idToken);
  return json(request, env, { deleted: true, id }, 200);
}

async function bootstrapAdminAccess({ request, env, user }) {
  requireAdminUser(user, env);
  return json(
    request,
    env,
    {
      ok: true,
      message: "Admin access is active for this signed-in account."
    },
    200
  );
}

async function handlePaystackWebhook(request, env) {
  const bodyText = await request.text();
  const webhookSecret = String(env.PAYSTACK_WEBHOOK_SECRET || "").trim();

  if (webhookSecret) {
    const signature = (request.headers.get("x-paystack-signature") || "").toLowerCase();
    const expected = await createHmacSha512Hex(webhookSecret, bodyText);
    if (!constantTimeEqual(signature, expected)) {
      throw new HttpError(401, "Invalid webhook signature.");
    }
  }

  let payload = {};
  try {
    payload = JSON.parse(bodyText || "{}");
  } catch {
    throw new HttpError(400, "Invalid webhook payload.");
  }

  return json(
    request,
    env,
    {
      ok: true,
      received: true,
      event: payload?.event || null
    },
    200
  );
}

async function getCatalogProducts(env, options = {}) {
  const includeInactive = Boolean(options?.includeInactive);
  const forceRefresh = Boolean(options?.forceRefresh);
  const now = Date.now();

  if (!forceRefresh && now < cachedCatalog.expiresAt && cachedCatalog.products.length) {
    return includeInactive
      ? cachedCatalog.products
      : cachedCatalog.products.filter((product) => product.active);
  }

  let products = [];
  let firestoreLoaded = false;
  try {
    const firestoreProducts = await listProductsFromFirestore(env);
    firestoreLoaded = true;
    products = firestoreProducts;
  } catch {
    // fall back below
  }

  if (!firestoreLoaded) {
    products = Object.values(FALLBACK_PRODUCT_CATALOG).map((row) => ({
      ...row,
      managed: false
    }));
  }

  products = products
    .map((row) => normalizeProductRow(row))
    .filter((row) => Boolean(row.id && row.name && row.price > 0))
    .map((row) => applyProductPricing(row, now))
    .sort((left, right) => left.name.localeCompare(right.name));

  cachedCatalog = {
    expiresAt: now + PRODUCT_CACHE_TTL_MS,
    products
  };

  return includeInactive ? products : products.filter((product) => product.active);
}

function invalidateCatalogCache() {
  cachedCatalog = {
    expiresAt: 0,
    products: []
  };
}

async function listProductsFromFirestore(env) {
  const documents = [];
  let pageToken = "";

  do {
    const payload = await firestoreListDocuments(env, "products", pageToken);
    const rows = Array.isArray(payload?.documents) ? payload.documents : [];
    rows.forEach((doc) => documents.push(doc));
    pageToken = String(payload?.nextPageToken || "");
  } while (pageToken);

  return documents
    .map((document) => decodeProductDocument(document))
    .filter((product) => Boolean(product?.id));
}

async function listAnnouncementsFromFirestore(env) {
  const documents = await listCollectionDocuments(env, "announcements");
  return documents
    .map((document) => decodeAnnouncementDocument(document))
    .filter((row) => Boolean(row?.id));
}

async function getAnnouncementById(env, id) {
  const safeId = sanitizeSimpleId(id);
  if (!safeId) return null;
  try {
    const payload = await getDocument(env, `announcements/${safeId}`);
    if (!payload?.name) return null;
    return decodeAnnouncementDocument(payload);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

async function listCouponsFromFirestore(env, idToken) {
  const documents = await listCollectionDocuments(env, "coupons", idToken);
  return documents
    .map((document) => decodeCouponDocument(document))
    .filter((row) => Boolean(row?.code));
}

async function listBlogPostsFromFirestore(env, idToken) {
  const documents = await listCollectionDocuments(env, "blog_posts", idToken);
  return documents
    .map((document) => decodeBlogPostDocument(document))
    .filter((row) => Boolean(row?.id));
}

async function getCouponByCode(env, code, idToken) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  try {
    const payload = await getDocument(env, `coupons/${normalized}`, idToken);
    if (!payload?.name) return null;
    return decodeCouponDocument(payload);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

async function getBlogPostById(env, id, idToken) {
  const safeId = sanitizeSimpleId(id);
  if (!safeId) return null;
  try {
    const payload = await getDocument(env, `blog_posts/${safeId}`, idToken);
    if (!payload?.name) return null;
    return decodeBlogPostDocument(payload);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

async function queryPublishedBlogPosts(env) {
  const query = {
    from: [{ collectionId: "blog_posts" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "status" },
        op: "EQUAL",
        value: { stringValue: "published" }
      }
    },
    limit: MAX_BLOG_POSTS_PUBLIC
  };

  const rows = await firestoreRunQuery(env, query);
  return rows
    .map((document) => decodeBlogPostDocument(document))
    .filter((row) => Boolean(row?.id));
}

async function queryPublishedBlogPostBySlug(env, slug) {
  const normalizedSlug = normalizeBlogSlug(slug);
  if (!normalizedSlug) return null;

  const query = {
    from: [{ collectionId: "blog_posts" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "status" },
        op: "EQUAL",
        value: { stringValue: "published" }
      }
    },
    limit: 200
  };

  const rows = await firestoreRunQuery(env, query);
  const first = rows
    .map((document) => decodeBlogPostDocument(document))
    .find((post) => post.slug === normalizedSlug);
  return first || null;
}

async function getProductById(env, productId) {
  const safeId = sanitizeProductDocumentId(productId);
  if (!safeId) return null;

  try {
    const payload = await firestoreGetDocument(env, `products/${safeId}`);
    if (!payload?.name) return null;
    return decodeProductDocument(payload);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

function normalizeProductPayload(raw, nowIso) {
  const input = raw && typeof raw === "object" ? raw : {};
  const existingDocumentId = sanitizeProductDocumentId(input.id || "");
  const generatedId = existingDocumentId || sanitizeProductId(input.name || "");
  if (!generatedId) {
    throw new HttpError(400, "Product id or name is required.");
  }

  const name = String(input.name || "").trim();
  if (!name || name.length < 2 || name.length > 120) {
    throw new HttpError(400, "Product name must be between 2 and 120 characters.");
  }

  const price = Number(input.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new HttpError(400, "Product price must be greater than 0.");
  }

  const description = String(input.description || "").trim().slice(0, 1000);
  const stockQuantity = normalizeStockQuantity(input.stockQuantity);
  const image = String(input.image || "").trim();
  const isUrlOrAssetPath = /^(https?:\/\/|\/?images\/)/i.test(image);
  const isImageDataUrl = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(image);
  if (image && !isUrlOrAssetPath && !isImageDataUrl) {
    throw new HttpError(400, "Image must be a valid URL, images/ path, or uploaded image.");
  }
  if (isImageDataUrl && image.length > MAX_PRODUCT_IMAGE_DATA_URL_LENGTH) {
    throw new HttpError(400, "Uploaded image is too large. Use a smaller image.");
  }

  const salePrice = toNumber(input.salePrice, 0);
  const saleStart = normalizeIsoDateTime(input.saleStart || "");
  const saleEnd = normalizeIsoDateTime(input.saleEnd || "");
  if (saleStart && saleEnd && new Date(saleStart).getTime() > new Date(saleEnd).getTime()) {
    throw new HttpError(400, "Sale start date must be before sale end date.");
  }
  if (salePrice && (salePrice <= 0 || salePrice >= price)) {
    throw new HttpError(400, "Sale price must be lower than regular price.");
  }

  const normalized = {
    id: generatedId,
    name,
    description,
    price: Math.round(price),
    stockQuantity,
    salePrice: salePrice > 0 ? Math.round(salePrice) : 0,
    saleStart,
    saleEnd,
    image,
    active: input.active !== false,
    updatedAt: nowIso,
    createdAt: String(input.createdAt || nowIso)
  };

  return normalizeProductRow(normalized);
}

function normalizeProductRow(raw) {
  const product = raw && typeof raw === "object" ? raw : {};
  const documentId = sanitizeProductDocumentId(product.documentId || product.id || "");
  const id = documentId || sanitizeProductId(product.id || product.name || "");
  const name = String(product.name || "").trim();
  const price = Math.round(toNumber(product.price, 0));
  const stockQuantity = normalizeStockQuantity(product.stockQuantity);

  return {
    documentId,
    id,
    name,
    description: String(product.description || "").trim(),
    price: price > 0 ? price : 0,
    stockQuantity,
    salePrice: Math.round(toNumber(product.salePrice, 0)),
    saleStart: normalizeIsoDateTime(product.saleStart || ""),
    saleEnd: normalizeIsoDateTime(product.saleEnd || ""),
    image: String(product.image || "").trim(),
    active: product.active !== false,
    updatedAt: String(product.updatedAt || ""),
    createdAt: String(product.createdAt || ""),
    managed: product.managed !== false,
    inStock: stockQuantity === null || stockQuantity > 0
  };
}

function applyProductPricing(product, nowMs) {
  const row = normalizeProductRow(product);
  const basePrice = Math.round(toNumber(row.price, 0));
  const salePrice = Math.round(toNumber(row.salePrice, 0));

  const startMs = row.saleStart ? new Date(row.saleStart).getTime() : null;
  const endMs = row.saleEnd ? new Date(row.saleEnd).getTime() : null;
  const hasWindow = startMs !== null || endMs !== null;
  const withinStart = startMs === null || nowMs >= startMs;
  const withinEnd = endMs === null || nowMs <= endMs;
  const withinWindow = !hasWindow || (withinStart && withinEnd);
  const saleActive = salePrice > 0 && salePrice < basePrice && withinWindow;
  const effectivePrice = saleActive ? salePrice : basePrice;

  return {
    ...row,
    price: basePrice,
    originalPrice: basePrice,
    effectivePrice,
    saleActive
  };
}

function isFallbackProductId(productId) {
  return Boolean(FALLBACK_PRODUCT_CATALOG[productId]);
}

function getFallbackProductById(productId) {
  if (!isFallbackProductId(productId)) return null;
  return normalizeProductRow({
    ...FALLBACK_PRODUCT_CATALOG[productId],
    managed: false
  });
}

function sanitizeProductId(value) {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug;
}

function sanitizeProductDocumentId(value) {
  return String(value || "")
    .trim()
    .replace(/\//g, "")
    .slice(0, 200);
}

function sanitizeSimpleId(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .slice(0, 100);
}

function normalizeStockQuantity(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    throw new HttpError(400, "Stock quantity must be a whole number that is 0 or higher.");
  }

  return Math.max(0, Math.trunc(parsed));
}

function normalizeIsoDateTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "Invalid date/time value.");
  }
  return parsed.toISOString();
}

function sortIsoDesc(leftIso, rightIso) {
  const left = new Date(leftIso || 0).getTime();
  const right = new Date(rightIso || 0).getTime();
  return right - left;
}

function normalizeAnnouncementRow(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const id = sanitizeSimpleId(input.id || "");
  const typeRaw = String(input.type || "info").trim().toLowerCase();
  const type = ["info", "success", "warning"].includes(typeRaw) ? typeRaw : "info";

  return {
    id,
    title: String(input.title || "").trim(),
    message: String(input.message || "").trim(),
    type,
    active: input.active !== false,
    startsAt: normalizeIsoDateTime(input.startsAt || ""),
    endsAt: normalizeIsoDateTime(input.endsAt || ""),
    createdAt: normalizeIsoDateTime(input.createdAt || ""),
    updatedAt: normalizeIsoDateTime(input.updatedAt || "")
  };
}

function normalizeAnnouncementPayload(raw, nowIso) {
  const input = raw && typeof raw === "object" ? raw : {};
  const generatedId = sanitizeSimpleId(input.id || input.title || `announcement-${Date.now()}`);
  if (!generatedId) {
    throw new HttpError(400, "Announcement title is required.");
  }

  const title = String(input.title || "").trim();
  const message = String(input.message || "").trim();
  if (!title || !message) {
    throw new HttpError(400, "Announcement title and message are required.");
  }

  const startsAt = normalizeIsoDateTime(input.startsAt || "");
  const endsAt = normalizeIsoDateTime(input.endsAt || "");
  if (startsAt && endsAt && new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
    throw new HttpError(400, "Announcement start date must be before end date.");
  }

  return normalizeAnnouncementRow({
    id: generatedId,
    title: title.slice(0, 120),
    message: message.slice(0, 400),
    type: input.type || "info",
    active: input.active !== false,
    startsAt,
    endsAt,
    createdAt: input.createdAt || nowIso,
    updatedAt: nowIso
  });
}

function isAnnouncementActive(row, nowMs = Date.now()) {
  if (!row || row.active === false) return false;
  const startMs = row.startsAt ? new Date(row.startsAt).getTime() : null;
  const endMs = row.endsAt ? new Date(row.endsAt).getTime() : null;
  const withinStart = startMs === null || nowMs >= startMs;
  const withinEnd = endMs === null || nowMs <= endMs;
  return withinStart && withinEnd;
}

function normalizeCouponCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 30);
}

function normalizeCouponRow(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const code = normalizeCouponCode(input.code || "");
  const typeRaw = String(input.type || "percent").trim().toLowerCase();
  const type = typeRaw === "fixed" ? "fixed" : "percent";
  return {
    code,
    description: String(input.description || "").trim(),
    type,
    value: Math.round(toNumber(input.value, 0)),
    minSubtotal: Math.round(toNumber(input.minSubtotal, 0)),
    active: input.active !== false,
    startsAt: normalizeIsoDateTime(input.startsAt || ""),
    endsAt: normalizeIsoDateTime(input.endsAt || ""),
    createdAt: normalizeIsoDateTime(input.createdAt || ""),
    updatedAt: normalizeIsoDateTime(input.updatedAt || "")
  };
}

function normalizeCouponPayload(raw, nowIso) {
  const input = raw && typeof raw === "object" ? raw : {};
  const code = normalizeCouponCode(input.code || "");
  if (!code) {
    throw new HttpError(400, "Coupon code is required.");
  }

  const typeRaw = String(input.type || "percent").trim().toLowerCase();
  const type = typeRaw === "fixed" ? "fixed" : "percent";
  const value = Math.round(toNumber(input.value, 0));
  if (type === "percent" && (value <= 0 || value > 90)) {
    throw new HttpError(400, "Percent coupon must be between 1 and 90.");
  }
  if (type === "fixed" && value <= 0) {
    throw new HttpError(400, "Fixed coupon amount must be greater than 0.");
  }

  const minSubtotal = Math.max(0, Math.round(toNumber(input.minSubtotal, 0)));
  const startsAt = normalizeIsoDateTime(input.startsAt || "");
  const endsAt = normalizeIsoDateTime(input.endsAt || "");
  if (startsAt && endsAt && new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
    throw new HttpError(400, "Coupon start date must be before end date.");
  }

  return normalizeCouponRow({
    code,
    description: String(input.description || "").trim().slice(0, 140),
    type,
    value,
    minSubtotal,
    active: input.active !== false,
    startsAt,
    endsAt,
    createdAt: input.createdAt || nowIso,
    updatedAt: nowIso
  });
}

function normalizeBlogSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeBlogStatus(value) {
  return String(value || "").trim().toLowerCase() === "published" ? "published" : "draft";
}

function normalizeBlogPostRow(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const id = sanitizeSimpleId(input.id || "");
  const slug = normalizeBlogSlug(input.slug || input.title || "");
  const status = normalizeBlogStatus(input.status || "draft");

  return {
    id,
    slug,
    title: String(input.title || "").trim(),
    excerpt: String(input.excerpt || "").trim(),
    content: String(input.content || "").trim(),
    coverImage: String(input.coverImage || "").trim(),
    tags: Array.isArray(input.tags)
      ? input.tags.map((tag) => String(tag || "").trim()).filter(Boolean).slice(0, 20)
      : [],
    status,
    publishedAt: status === "published" ? normalizeIsoDateTime(input.publishedAt || "") : "",
    createdAt: normalizeIsoDateTime(input.createdAt || ""),
    updatedAt: normalizeIsoDateTime(input.updatedAt || "")
  };
}

function normalizeBlogPostPayload(raw, nowIso) {
  const input = raw && typeof raw === "object" ? raw : {};
  const title = String(input.title || "").trim();
  if (!title || title.length < 5 || title.length > 180) {
    throw new HttpError(400, "Blog title must be between 5 and 180 characters.");
  }

  const excerpt = String(input.excerpt || "").trim();
  const content = String(input.content || "").trim();
  if (!content || content.length < 20) {
    throw new HttpError(400, "Blog content must be at least 20 characters.");
  }

  const slug = normalizeBlogSlug(input.slug || title);
  if (!slug) {
    throw new HttpError(400, "Blog slug is required.");
  }

  const generatedId = sanitizeSimpleId(input.id || slug);
  if (!generatedId) {
    throw new HttpError(400, "Blog id is required.");
  }

  const coverImage = String(input.coverImage || "").trim();
  if (coverImage && !/^(https?:\/\/|\/?images\/|data:image\/)/i.test(coverImage)) {
    throw new HttpError(400, "Cover image must be a valid URL, images/ path, or uploaded image.");
  }

  const tags = Array.isArray(input.tags)
    ? input.tags.map((tag) => String(tag || "").trim()).filter(Boolean).slice(0, 20)
    : [];
  const status = normalizeBlogStatus(input.status || "draft");
  const publishedAt = status === "published" ? normalizeIsoDateTime(input.publishedAt || nowIso) : "";

  return normalizeBlogPostRow({
    id: generatedId,
    slug,
    title: title.slice(0, 180),
    excerpt: excerpt.slice(0, 260),
    content: content.slice(0, 40000),
    coverImage,
    tags,
    status,
    publishedAt,
    createdAt: input.createdAt || nowIso,
    updatedAt: nowIso
  });
}

function normalizeSessionMode(value) {
  return String(value || "").trim().toLowerCase() === "always_login"
    ? "always_login"
    : "lock_after_inactivity";
}

function normalizeModalActionUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:\/\/|\/|\.\/|[A-Za-z0-9._-]+\.html(?:[?#].*)?$)/i.test(raw)) {
    return raw.slice(0, 500);
  }
  throw new HttpError(400, "Modal button link must be a valid URL or page path.");
}

function normalizeSiteExperienceRow(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const modalImage = String(input.modalImage || "").trim();
  if (modalImage && !/^(https?:\/\/|\/?images\/|data:image\/)/i.test(modalImage)) {
    throw new HttpError(400, "Modal image must be a valid URL, images/ path, or uploaded image.");
  }
  if (/^data:image\//i.test(modalImage) && modalImage.length > MAX_PRODUCT_IMAGE_DATA_URL_LENGTH) {
    throw new HttpError(400, "Uploaded modal image is too large. Use a smaller image.");
  }

  return {
    sessionMode: normalizeSessionMode(input.sessionMode),
    inactivityMinutes: clamp(
      Math.trunc(toNumber(input.inactivityMinutes, DEFAULT_SITE_EXPERIENCE.inactivityMinutes)),
      1,
      120
    ),
    modalEnabled: input.modalEnabled === true,
    modalTitle: String(input.modalTitle || "").trim().slice(0, 120),
    modalMessage: String(input.modalMessage || "").trim().slice(0, 600),
    modalImage,
    modalButtonLabel: String(input.modalButtonLabel || "").trim().slice(0, 40),
    modalButtonUrl: normalizeModalActionUrl(input.modalButtonUrl || ""),
    createdAt: normalizeIsoDateTime(input.createdAt || ""),
    updatedAt: normalizeIsoDateTime(input.updatedAt || "")
  };
}

function normalizeSiteExperiencePayload(raw, createdAt, updatedAt) {
  return normalizeSiteExperienceRow({
    ...DEFAULT_SITE_EXPERIENCE,
    ...(raw && typeof raw === "object" ? raw : {}),
    createdAt,
    updatedAt
  });
}

async function getSiteExperienceDocument(env) {
  try {
    const payload = await getDocument(env, "site_settings/experience");
    if (!payload?.name) return null;
    return decodeSiteExperienceDocument(payload);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

async function getSiteExperienceSettings(env) {
  const existing = await getSiteExperienceDocument(env);
  return normalizeSiteExperiencePayload(
    existing || DEFAULT_SITE_EXPERIENCE,
    existing?.createdAt || "",
    existing?.updatedAt || ""
  );
}

function isCouponActive(coupon, subtotal, nowMs = Date.now()) {
  if (!coupon || coupon.active === false) return false;
  if (subtotal < Math.max(0, toNumber(coupon.minSubtotal, 0))) return false;
  const startMs = coupon.startsAt ? new Date(coupon.startsAt).getTime() : null;
  const endMs = coupon.endsAt ? new Date(coupon.endsAt).getTime() : null;
  const withinStart = startMs === null || nowMs >= startMs;
  const withinEnd = endMs === null || nowMs <= endMs;
  return withinStart && withinEnd;
}

function calculateCouponDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  if (coupon.type === "fixed") {
    return Math.min(subtotal, Math.max(0, Math.round(toNumber(coupon.value, 0))));
  }
  const percent = Math.max(0, Math.min(90, Math.round(toNumber(coupon.value, 0))));
  return Math.min(subtotal, Math.round((subtotal * percent) / 100));
}

async function resolveCouponForCheckout(env, code, subtotal, idToken) {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) return null;

  const coupon = await getCouponByCode(env, normalizedCode, idToken);
  if (!coupon || !isCouponActive(coupon, subtotal, Date.now())) {
    throw new HttpError(400, "Coupon code is invalid or expired.");
  }

  const discount = calculateCouponDiscount(coupon, subtotal);
  if (discount <= 0) {
    throw new HttpError(400, "Coupon is not valid for this cart.");
  }

  return {
    ...coupon,
    discount
  };
}

async function requireUserFromAuthHeader(request, env) {
  const header = request.headers.get("Authorization") || "";
  const prefix = "Bearer ";

  if (!header.startsWith(prefix)) {
    throw new HttpError(401, "Missing auth token.");
  }

  const idToken = header.slice(prefix.length).trim();
  if (!idToken) {
    throw new HttpError(401, "Missing auth token.");
  }

  const apiKey = requireNonEmptyEnv(env, "FIREBASE_WEB_API_KEY");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    }
  );

  const payload = await response.json().catch(() => ({}));
  const user = payload?.users?.[0];

  if (!response.ok || !user?.localId) {
    const detail =
      payload?.error?.message ||
      payload?.error?.errors?.[0]?.message ||
      "";
    const suffix = detail ? ` (${detail})` : "";
    throw new HttpError(401, `Invalid or expired sign-in token. Please sign in again.${suffix}`);
  }

  return {
    uid: String(user.localId),
    email: normalizeEmail(user.email || ""),
    emailVerified: Boolean(user.emailVerified),
    displayName: String(user.displayName || ""),
    providerIds: Array.isArray(user.providerUserInfo)
      ? user.providerUserInfo
        .map((item) => String(item?.providerId || "").trim().toLowerCase())
        .filter(Boolean)
      : [],
    hasPassword: Boolean(user.passwordHash),
    idToken
  };
}

function requireIdToken(user) {
  const token = String(user?.idToken || "").trim();
  if (!token) {
    throw new HttpError(401, "Missing sign-in token.");
  }
  return token;
}

function requireVerifiedEmailUser(user) {
  if (!user || user.emailVerified) {
    return;
  }

  const providerIds = Array.isArray(user.providerIds) ? user.providerIds : [];
  const usesPassword = Boolean(user.hasPassword) || !providerIds.length || providerIds.includes("password");
  if (!usesPassword) {
    return;
  }

  throw new HttpError(403, "Please verify your email from your inbox before continuing.");
}

function getFirestoreProjectId(env) {
  return sanitizeEnvValue(env?.FIREBASE_PROJECT_ID) || DEFAULT_FIREBASE_PROJECT_ID;
}

function getFirestoreApiKey(env) {
  return requireNonEmptyEnv(env, "FIREBASE_WEB_API_KEY");
}

function buildFirestoreDocumentsUrl(env, documentPath = "") {
  const projectId = getFirestoreProjectId(env);
  const trimmed = String(documentPath || "").replace(/^\/+/, "");
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${trimmed}`;
}

async function firestoreListDocuments(env, collectionPath, pageToken = "", idToken = "") {
  const apiKey = getFirestoreApiKey(env);
  const params = new URLSearchParams({
    pageSize: "200",
    key: apiKey
  });
  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const url = `${buildFirestoreDocumentsUrl(env, collectionPath)}?${params.toString()}`;
  return await firestoreFetch(url, {
    method: "GET",
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {}
  });
}

async function firestoreGetDocument(env, documentPath, idToken = "") {
  const apiKey = getFirestoreApiKey(env);
  const params = new URLSearchParams({ key: apiKey });
  const url = `${buildFirestoreDocumentsUrl(env, documentPath)}?${params.toString()}`;
  return await firestoreFetch(url, {
    method: "GET",
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {}
  });
}

async function firestoreRunQuery(env, structuredQuery, idToken = "") {
  const apiKey = getFirestoreApiKey(env);
  const projectId = getFirestoreProjectId(env);
  const params = new URLSearchParams({ key: apiKey });
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery?${params.toString()}`;

  const payload = await firestoreFetch(url, {
    method: "POST",
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    body: JSON.stringify({ structuredQuery })
  });

  const rows = Array.isArray(payload) ? payload : [];
  return rows
    .map((row) => row?.document || null)
    .filter((document) => Boolean(document?.name));
}

async function listCollectionDocuments(env, collectionPath, idToken = "") {
  const documents = [];
  let pageToken = "";

  do {
    const payload = await firestoreListDocuments(env, collectionPath, pageToken, idToken);
    const rows = Array.isArray(payload?.documents) ? payload.documents : [];
    rows.forEach((row) => documents.push(row));
    pageToken = String(payload?.nextPageToken || "");
  } while (pageToken);

  return documents;
}

async function getDocument(env, documentPath, idToken = "") {
  return await firestoreGetDocument(env, documentPath, idToken);
}

async function writeProductDocument(env, productId, product, idToken) {
  return await writeDocument(env, `products/${productId}`, product, idToken);
}

async function patchProductDocument(env, productId, payload, updateFields, idToken) {
  return await patchDocument(env, `products/${productId}`, payload, updateFields, idToken);
}

async function writeDocument(env, documentPath, payload, idToken) {
  const apiKey = getFirestoreApiKey(env);
  const params = new URLSearchParams({ key: apiKey });
  const url = `${buildFirestoreDocumentsUrl(env, documentPath)}?${params.toString()}`;

  return await firestoreFetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({
      fields: encodeFirestoreFields(payload)
    })
  });
}

async function patchDocument(env, documentPath, payload, updateFields, idToken) {
  const apiKey = getFirestoreApiKey(env);
  const params = new URLSearchParams({ key: apiKey });
  (updateFields || []).forEach((field) => {
    params.append("updateMask.fieldPaths", field);
  });
  const url = `${buildFirestoreDocumentsUrl(env, documentPath)}?${params.toString()}`;

  return await firestoreFetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({
      fields: encodeFirestoreFields(payload)
    })
  });
}

async function deleteProductDocument(env, productId, idToken) {
  return await deleteDocument(env, `products/${productId}`, idToken);
}

async function deleteDocument(env, documentPath, idToken) {
  const apiKey = getFirestoreApiKey(env);
  const params = new URLSearchParams({ key: apiKey });
  const url = `${buildFirestoreDocumentsUrl(env, documentPath)}?${params.toString()}`;

  return await firestoreFetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });
}

async function firestoreFetch(url, options) {
  const response = await fetch(url, {
    method: options?.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    },
    body: options?.body
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = normalizeFirestoreErrorMessage(payload) || "Firestore request failed.";
    if (response.status === 404) throw new HttpError(404, message);
    if (response.status === 401 || response.status === 403) {
      throw new HttpError(403, message);
    }
    throw new HttpError(502, message);
  }

  return payload;
}

function normalizeFirestoreErrorMessage(payload) {
  const raw = String(payload?.error?.message || "").trim();
  if (!raw) return "";
  if (raw.toLowerCase().includes("missing or insufficient permissions")) {
    return "Missing Firestore permissions. Update Firestore rules for products, announcements, coupons, blog_posts, and site_settings.";
  }
  return raw;
}

function encodeFirestoreFields(object) {
  const input = object && typeof object === "object" ? object : {};
  const entries = Object.entries(input);
  const fields = {};
  entries.forEach(([key, value]) => {
    if (value === undefined) return;
    fields[key] = encodeFirestoreValue(value);
  });
  return fields;
}

function encodeFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => encodeFirestoreValue(item))
      }
    };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: encodeFirestoreFields(value)
      }
    };
  }
  return { stringValue: String(value) };
}

function decodeProductDocument(document) {
  const rawFields = decodeFirestoreFields(document?.fields || {});
  const fromName = String(document?.name || "").split("/").pop();
  return normalizeProductRow({
    documentId: fromName,
    id: fromName || rawFields.id,
    name: rawFields.name || "",
    description: rawFields.description || "",
    price: toNumber(rawFields.price, 0),
    stockQuantity: rawFields.stockQuantity,
    salePrice: toNumber(rawFields.salePrice, 0),
    saleStart: rawFields.saleStart || "",
    saleEnd: rawFields.saleEnd || "",
    image: rawFields.image || "",
    active: rawFields.active !== false,
    createdAt: rawFields.createdAt || "",
    updatedAt: rawFields.updatedAt || "",
    managed: rawFields.managed !== false
  });
}

function decodeAnnouncementDocument(document) {
  const rawFields = decodeFirestoreFields(document?.fields || {});
  const fromName = String(document?.name || "").split("/").pop();
  return normalizeAnnouncementRow({
    id: rawFields.id || fromName,
    title: rawFields.title || "",
    message: rawFields.message || "",
    type: rawFields.type || "info",
    active: rawFields.active !== false,
    startsAt: rawFields.startsAt || "",
    endsAt: rawFields.endsAt || "",
    createdAt: rawFields.createdAt || "",
    updatedAt: rawFields.updatedAt || ""
  });
}

function decodeCouponDocument(document) {
  const rawFields = decodeFirestoreFields(document?.fields || {});
  const fromName = String(document?.name || "").split("/").pop();
  return normalizeCouponRow({
    code: rawFields.code || fromName,
    description: rawFields.description || "",
    type: rawFields.type || "percent",
    value: toNumber(rawFields.value, 0),
    minSubtotal: toNumber(rawFields.minSubtotal, 0),
    active: rawFields.active !== false,
    startsAt: rawFields.startsAt || "",
    endsAt: rawFields.endsAt || "",
    createdAt: rawFields.createdAt || "",
    updatedAt: rawFields.updatedAt || ""
  });
}

function decodeBlogPostDocument(document) {
  const rawFields = decodeFirestoreFields(document?.fields || {});
  const fromName = String(document?.name || "").split("/").pop();
  return normalizeBlogPostRow({
    id: rawFields.id || fromName,
    slug: rawFields.slug || "",
    title: rawFields.title || "",
    excerpt: rawFields.excerpt || "",
    content: rawFields.content || "",
    coverImage: rawFields.coverImage || "",
    tags: Array.isArray(rawFields.tags) ? rawFields.tags : [],
    status: rawFields.status || "draft",
    publishedAt: rawFields.publishedAt || "",
    createdAt: rawFields.createdAt || "",
    updatedAt: rawFields.updatedAt || ""
  });
}

function decodeSiteExperienceDocument(document) {
  const rawFields = decodeFirestoreFields(document?.fields || {});
  return normalizeSiteExperienceRow({
    sessionMode: rawFields.sessionMode || DEFAULT_SITE_EXPERIENCE.sessionMode,
    inactivityMinutes: rawFields.inactivityMinutes,
    modalEnabled: rawFields.modalEnabled === true,
    modalTitle: rawFields.modalTitle || "",
    modalMessage: rawFields.modalMessage || "",
    modalImage: rawFields.modalImage || "",
    modalButtonLabel: rawFields.modalButtonLabel || "",
    modalButtonUrl: rawFields.modalButtonUrl || "",
    createdAt: rawFields.createdAt || "",
    updatedAt: rawFields.updatedAt || ""
  });
}

function decodeFirestoreFields(fields) {
  const output = {};
  Object.entries(fields || {}).forEach(([key, value]) => {
    output[key] = decodeFirestoreValue(value);
  });
  return output;
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("stringValue" in value) return String(value.stringValue || "");
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("integerValue" in value) return toNumber(value.integerValue, 0);
  if ("doubleValue" in value) return toNumber(value.doubleValue, 0);
  if ("timestampValue" in value) return String(value.timestampValue || "");
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    const values = Array.isArray(value.arrayValue?.values) ? value.arrayValue.values : [];
    return values.map((entry) => decodeFirestoreValue(entry));
  }
  if ("mapValue" in value) {
    return decodeFirestoreFields(value.mapValue?.fields || {});
  }
  return null;
}

async function initializePaystackTransaction(env, input) {
  const payload = {
    email: input.email,
    amount: input.amountKobo,
    currency: DEFAULT_CURRENCY,
    reference: input.orderRef,
    metadata: input.metadata
  };

  const data = await paystackRequest(env, "/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return data || {};
}

async function verifyPaystackTransaction(env, orderRef) {
  const encoded = encodeURIComponent(orderRef);
  const data = await paystackRequest(env, `/transaction/verify/${encoded}`, { method: "GET" });
  if (!data || !data.reference) {
    throw new HttpError(404, "Order not found.");
  }
  return data;
}

async function listPaystackOrders(env, maxPages) {
  const orders = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount && page <= maxPages) {
    const payload = await paystackRequestWithMeta(
      env,
      `/transaction?perPage=100&page=${page}`,
      { method: "GET" }
    );

    const rows = Array.isArray(payload?.data) ? payload.data : [];
    rows.forEach((row) => orders.push(buildOrderFromTransaction(row)));

    const rawPageCount = Number(payload?.meta?.pageCount || 1);
    pageCount = Number.isFinite(rawPageCount) ? rawPageCount : 1;
    page += 1;
  }

  return orders;
}

async function paystackRequest(env, path, options) {
  const payload = await paystackRequestWithMeta(env, path, options);
  return payload.data;
}

async function paystackRequestWithMeta(env, path, options) {
  const secretKey = getValidatedPaystackSecretKey(env);
  const url = `https://api.paystack.co${path}`;

  const response = await fetch(url, {
    method: options?.method || "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(options?.headers || {})
    },
    body: options?.body
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === false) {
    const message = payload?.message || "Paystack request failed.";
    throw new HttpError(502, message);
  }

  return payload;
}

async function cartToItems(cart, env) {
  if (!cart || typeof cart !== "object" || Array.isArray(cart)) {
    throw new HttpError(400, "Invalid cart payload.");
  }

  const entries = Object.entries(cart);
  if (!entries.length) return [];

  const catalogRows = await getCatalogProducts(env, { includeInactive: false });
  const catalog = {};
  catalogRows.forEach((row) => {
    catalog[row.id] = row;
  });

  const items = [];

  for (const [productId, rawQty] of entries) {
    const product = catalog[productId];
    if (!product) {
      throw new HttpError(
        400,
        "Cart contains an unavailable product. Please refresh your cart and try again."
      );
    }

    const qty = Number(rawQty);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 100) {
      throw new HttpError(400, "One or more cart quantities are invalid.");
    }

    const stockQuantity = product.stockQuantity;
    if (stockQuantity !== null && stockQuantity <= 0) {
      throw new HttpError(
        400,
        `${product.name} is out of stock. Please update your cart and try again.`
      );
    }
    if (stockQuantity !== null && qty > stockQuantity) {
      throw new HttpError(
        400,
        `${product.name} has only ${stockQuantity} left in stock. Please update your cart and try again.`
      );
    }

    const unitPrice = Number(product.effectivePrice || product.price);
    const lineTotal = unitPrice * qty;

    items.push({
      id: productId,
      name: product.name,
      qty,
      unitPrice,
      lineTotal
    });
  }

  return items;
}

function buildOrderFromTransaction(transaction) {
  const metadata = normalizeMetadata(transaction?.metadata);
  const rawItems = Array.isArray(metadata.items) ? metadata.items : [];
  const items = rawItems
    .map((item) => ({
      id: String(item?.id || ""),
      name: String(item?.name || "Item"),
      qty: toInt(item?.qty, 0),
      unitPrice: toNumber(item?.unitPrice, 0),
      lineTotal: toNumber(item?.lineTotal, 0)
    }))
    .filter((item) => item.qty > 0);

  const totalFromPaystack = toNumber(transaction?.amount, 0) / 100;
  const subtotalFromItems = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const subtotal = toNumber(metadata?.subtotal, subtotalFromItems || totalFromPaystack);
  const discount = toNumber(metadata?.discount, Math.max(0, subtotal - totalFromPaystack));
  const total = totalFromPaystack > 0
    ? totalFromPaystack
    : toNumber(metadata?.total, Math.max(0, subtotal - discount));

  const createdAt =
    transaction?.paid_at ||
    transaction?.transaction_date ||
    transaction?.created_at ||
    new Date().toISOString();

  return {
    orderRef: String(transaction?.reference || metadata?.orderRef || "-"),
    userId: String(metadata?.userId || ""),
    userEmail: normalizeEmail(metadata?.userEmail || transaction?.customer?.email || ""),
    items,
    subtotal,
    discount,
    total,
    couponCode: String(metadata?.couponCode || ""),
    paymentStatus: transaction?.status === "success" ? "paid" : "pending",
    currency: String(transaction?.currency || metadata?.currency || DEFAULT_CURRENCY),
    createdAt
  };
}

function normalizeMetadata(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object") return value;
  return {};
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}

function createOrderRef() {
  const raw = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase();
  return `BF-${Date.now()}-${raw.slice(0, 6)}`;
}

function cleanOrderRef(rawRef) {
  const ref = String(rawRef || "").trim();
  if (!ref) {
    throw new HttpError(400, "Missing order reference.");
  }
  return ref;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePath(pathname) {
  if (!pathname) return "/";
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

function getOwnerEmailSet(env) {
  return new Set(
    String(env.ADMIN_OWNER_EMAILS || "")
      .split(",")
      .map((item) => normalizeEmail(item))
      .filter(Boolean)
  );
}

function isAdminUser(user, env) {
  const owners = getOwnerEmailSet(env);
  return Boolean(user?.email && owners.has(normalizeEmail(user.email)));
}

function requireAdminUser(user, env) {
  if (!isAdminUser(user, env)) {
    throw new HttpError(403, "You are not an admin.");
  }
}

function isOwnedOrder(order, user) {
  if (order.userId) {
    return order.userId === user.uid;
  }
  if (order.userEmail && user.email) {
    return normalizeEmail(order.userEmail) === normalizeEmail(user.email);
  }
  return false;
}

function normalizeFilterStatus(value) {
  const normalized = String(value || "all").toLowerCase();
  if (normalized === "paid" || normalized === "pending") return normalized;
  return "all";
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function requireNonEmptyEnv(env, key) {
  const value = sanitizeEnvValue(env?.[key]);
  if (!value) {
    throw new HttpError(500, `Server is missing configuration: ${key}`);
  }
  return value;
}

function sanitizeEnvValue(raw) {
  return String(raw || "")
    .trim()
    .replace(/^["']+/, "")
    .replace(/["']+$/, "");
}

function getValidatedPaystackPublicKey(env) {
  const key = requireNonEmptyEnv(env, "PAYSTACK_PUBLIC_KEY");
  if (!/^pk_(test|live)_[A-Za-z0-9]+$/i.test(key)) {
    throw new HttpError(
      500,
      "Server PAYSTACK_PUBLIC_KEY is invalid. It must start with pk_test_ or pk_live_."
    );
  }
  return key;
}

function getValidatedPaystackSecretKey(env) {
  const key = requireNonEmptyEnv(env, "PAYSTACK_SECRET_KEY");
  if (!/^sk_(test|live)_[A-Za-z0-9]+$/i.test(key)) {
    throw new HttpError(
      500,
      "Server PAYSTACK_SECRET_KEY is invalid. It must start with sk_test_ or sk_live_."
    );
  }
  return key;
}

function assertPaystackKeyModesMatch(env, publicKey) {
  const secretKey = getValidatedPaystackSecretKey(env);
  const publicMode = getPaystackKeyMode(publicKey);
  const secretMode = getPaystackKeyMode(secretKey);
  if (publicMode !== secretMode) {
    throw new HttpError(
      500,
      "PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY mode mismatch. Use test+test or live+live."
    );
  }
}

function getPaystackKeyMode(key) {
  const normalized = String(key || "").toLowerCase();
  if (normalized.startsWith("pk_test_") || normalized.startsWith("sk_test_")) return "test";
  if (normalized.startsWith("pk_live_") || normalized.startsWith("sk_live_")) return "live";
  return "unknown";
}

async function createHmacSha512Hex(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToHex(new Uint8Array(signature));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function withCors(response, request, env) {
  const headers = buildCorsHeaders(request, env);
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

function buildCorsHeaders(request, env) {
  const requestOrigin = request.headers.get("Origin") || "";
  const allowedOrigins = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  let allowedOrigin = "*";
  if (allowedOrigins.includes("*")) {
    allowedOrigin = "*";
  } else if (requestOrigin && allowedOrigins.length) {
    allowedOrigin = allowedOrigins.some((pattern) => matchesOriginPattern(requestOrigin, pattern))
      ? requestOrigin
      : "null";
  } else if (requestOrigin) {
    allowedOrigin = requestOrigin;
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

function matchesOriginPattern(requestOrigin, pattern) {
  if (!requestOrigin || !pattern) return false;
  if (pattern === "*") return true;
  if (requestOrigin === pattern) return true;

  const wildcardToken = "://*.";
  if (!pattern.includes(wildcardToken)) return false;

  const patternParts = pattern.split(wildcardToken);
  const requestParts = requestOrigin.split("://");
  if (patternParts.length !== 2 || requestParts.length !== 2) return false;

  const [patternProtocol, patternSuffix] = patternParts;
  const [requestProtocol, requestHost] = requestParts;
  if (!patternProtocol || !patternSuffix || patternProtocol !== requestProtocol) return false;

  const normalizedRequestHost = requestHost.toLowerCase();
  const normalizedSuffix = patternSuffix.toLowerCase();
  return normalizedRequestHost.endsWith(`.${normalizedSuffix}`);
}

function json(request, env, body, status) {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
  return withCors(response, request, env);
}

function handleError(error, request, env) {
  if (error instanceof HttpError) {
    return json(request, env, { error: error.message }, error.status);
  }

  return json(request, env, { error: "Unexpected server error." }, 500);
}
