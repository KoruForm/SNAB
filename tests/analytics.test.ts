import test from "node:test";
import assert from "node:assert/strict";
import { arrivalCampaign } from "../lib/analytics";

test("arrivalCampaign reads and cleans the flyer campaign", () => {
  assert.equal(arrivalCampaign("?utm_source=flyer&utm_medium=qr&utm_campaign=drop-Hillcrest"), "drop-hillcrest");
  assert.equal(arrivalCampaign("?utm_campaign=drop%20rototuna%3Cscript%3E"), "droprototunascript");
  assert.equal(arrivalCampaign(""), "");
  assert.equal(arrivalCampaign("?utm_campaign=" + "a".repeat(200)).length, 60);
});
