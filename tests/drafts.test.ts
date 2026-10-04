import "fake-indexeddb/auto";
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { addressVisible, blankDraft, localDateKey, publicAddress, validateDays } from "../lib/drafts/types";
import { createDraft, getDraft, updateDraft, getPhotos, addPhotos, deleteDraft, removePhoto, MAX_PHOTOS } from "../lib/drafts/storage";

test("sale-day disclosure uses Auckland's date and hides the address on non-sale days", () => {
  const draft = blankDraft("test");
  draft.days = [{ date: "2026-10-04", starts: "08:00", finishes: "13:00" }, { date: "2026-10-06", starts: "08:00", finishes: "13:00" }];
  draft.location = { address: "123 Test Street", town: "Hamilton", reveal: "sale-day" };
  assert.equal(localDateKey(new Date("2026-10-03T12:00:00Z")), "2026-10-04");
  assert.equal(publicAddress(draft, new Date("2026-10-03T12:00:00Z")), "123 Test Street");
  assert.ok(!publicAddress(draft, new Date("2026-10-04T12:00:00Z")).includes("123"));
  assert.ok(!publicAddress(draft, new Date("2026-10-06T12:00:00Z")).includes("123"));
  draft.location.reveal = "area-only";
  assert.equal(publicAddress(draft, new Date("2026-10-03T12:00:00Z")), "Hamilton");
});

test("the street is hidden again once a sale is closed or its last day has passed", () => {
  const draft = blankDraft("finished");
  draft.days = [{ date: "2026-10-04", starts: "08:00", finishes: "13:00" }];
  draft.location = { address: "123 Test Street", town: "Hamilton", reveal: "now" };
  assert.equal(addressVisible(draft, new Date("2026-10-01T12:00:00Z")), true);
  assert.equal(addressVisible(draft, new Date("2026-10-04T12:00:00Z")), false);
  assert.equal(publicAddress(draft, new Date("2026-10-04T12:00:00Z")), "Hamilton");
  draft.status = "closed";
  assert.equal(addressVisible(draft, new Date("2026-10-01T12:00:00Z")), false);
  draft.location.reveal = "sale-day";
  assert.equal(addressVisible(draft, new Date("2026-10-03T12:00:00Z")), false);
  assert.equal(publicAddress(draft, new Date("2026-10-03T12:00:00Z")), "Hamilton");
});

test("invalid, duplicate and inverted dates/times are rejected", () => {
  const day = { date: "2026-10-04", starts: "08:00", finishes: "13:00" };
  assert.equal(validateDays([day], "2026-10-04"), null);
  for (const days of [[{ ...day, date: "2026-02-30" }], [day, day], [{ ...day, finishes: "07:00" }], [{ ...day, starts: "25:00" }], [{ ...day, date: "2026-10-03" }]]) assert.ok(validateDays(days, "2026-10-04"));
});

test("draft metadata and photo blobs persist; deleting one draft preserves another", async () => {
  const a = await createDraft();
  const b = await createDraft();
  await updateDraft(a.id, { title: "Workshop clearout", location: { address: "Private street", town: "Hamilton", reveal: "area-only" } });
  const file = new File([new Uint8Array([1, 2, 3])], "test.png", { type: "image/png" });
  await addPhotos(a.id, [file]); await addPhotos(b.id, [file]);
  assert.equal((await getDraft(a.id))?.title, "Workshop clearout");
  assert.equal((await getDraft(a.id))?.location.address, "Private street");
  assert.deepEqual([...new Uint8Array(await (await getPhotos(a.id))[0].blob.arrayBuffer())], [1, 2, 3]);
  await deleteDraft(a.id);
  assert.equal(await getDraft(a.id), undefined); assert.equal((await getPhotos(a.id)).length, 0);
  assert.equal((await getPhotos(b.id)).length, 1); assert.ok(await getDraft(b.id));
  await removePhoto((await getPhotos(b.id))[0].id); assert.equal((await getPhotos(b.id)).length, 0);
});

test("photo count and size limits reject an entire batch without leaving partial images", async () => {
  const draft = await createDraft();
  const small = new File(["x"], "test.png", { type: "image/png" });
  await addPhotos(draft.id, [small]);
  await assert.rejects(addPhotos(draft.id, Array.from({ length: MAX_PHOTOS }, () => small)), /40 photos/);
  assert.equal((await getPhotos(draft.id)).length, 1);
  const large = new File([new Uint8Array(20 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
  await assert.rejects(addPhotos(draft.id, [small, large]), /20 MB/);
  assert.equal((await getPhotos(draft.id)).length, 1);
  await deleteDraft(draft.id);
  await assert.rejects(addPhotos(draft.id, [small]), /no longer exists/);
});
