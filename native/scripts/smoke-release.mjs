// Creates a synthetic account in an explicitly selected disposable environment.
// Never logs passwords, bearer tokens, or response bodies containing credentials.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = process.env.SMOKE_API_URL?.replace(/\/$/, "");
if (!base || process.env.SMOKE_ALLOW_WRITES !== "1")
  throw Error(
    "Set SMOKE_API_URL (ending /api) and SMOKE_ALLOW_WRITES=1 for a disposable test database",
  );
const steps = [];
const facts = {};
let token;
async function request(path, method = "GET", body, headers = {}, status) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  assert.ok(
    status ? response.status === status : response.ok,
    `${method} ${path}: HTTP ${response.status}`,
  );
  steps.push({ method, path, status: response.status });
  return response.status === 204 ? null : response.json();
}
try {
  const email = `release-${randomUUID()}@example.invalid`;
  const password = randomUUID() + "Aa1!";
  const registered = await request("/auth/register", "POST", {
    email,
    password,
    displayName: "Release check",
  });
  const login = await request("/auth/login", "POST", { email, password });
  assert.equal(login.userId, registered.userId);
  token = login.accessToken;
  const me = await request("/me");
  assert.equal(me.userId, login.userId);
  await request("/me", "PUT", {
    displayName: "Release verified",
    bio: "Disposable integration account",
    avatarKey: "BOOK",
    interestTopicIds: [],
  });
  assert.equal((await request("/me")).displayName, "Release verified");
  const topics = await request("/topics");
  const books = await request("/books?page=0&size=1");
  if (!process.argv.includes("--account-only")) {
    const topic = topics.find((t) => t.conceptAssessmentReady);
    assert.ok(
      topic,
      "No assessment-ready topic: import pinned catalog and approved question artifacts first",
    );
    assert.ok(
      books.totalElements > 0,
      "Catalog must contain real imported books",
    );
    const session = await request("/assessments/concepts", "POST", {
      userId: login.userId,
      topicId: topic.id,
    });
    assert.ok(session.questions.length > 0);
    for (const q of session.questions) {
      await request(
        `/assessments/${session.id}/answers/${q.id}`,
        "PUT",
        q.answerMode === "MULTIPLE_CHOICE"
          ? { selectedChoiceIndex: 0 }
          : { knowsConcept: false },
      );
    }
    const { profile } = await request(
      `/assessments/${session.id}/complete`,
      "POST",
    );
    assert.equal(
      (await request(`/users/${login.userId}/profiles/${topic.id}`)).id,
      profile.id,
    );
    const result = await request(
      "/learning-recommendations?modelVersion=concept-learning-v2",
      "POST",
      {
        userId: login.userId,
        topicId: topic.id,
        profileId: profile.id,
        ability: "meaning",
        topK: 5,
      },
      { "Idempotency-Key": randomUUID() },
    );
    assert.equal(result.modelVersion, "concept-learning-v2");
    assert.ok(
      result.items.length > 0,
      "Imported mapped books must yield recommendation items",
    );
    assert.ok(
      result.items.some((item) => item.readingChecklist?.concepts?.length > 0),
      "V2 recommendations must expose the connected concept checklist",
    );
    Object.assign(facts, {
      catalogBooks: books.totalElements,
      questionCount: session.questions.length,
      mappedCandidates: result.mappedCandidateCount,
      recommendationItems: result.items.length,
    });
    assert.deepEqual(
      await request(`/learning-recommendations/${result.id}`),
      result,
    );
    const bookId = books.content[0].id;
    await request(`/users/${login.userId}/shelf/${bookId}`, "POST");
    await request(`/users/${login.userId}/shelf/${bookId}`, "PUT", {
      status: "READING",
      note: "Release smoke test",
    });
    const shelf = await request(`/users/${login.userId}/shelf`);
    assert.ok(
      shelf.content.some(
        (entry) =>
          entry.bookId === bookId && entry.note === "Release smoke test",
      ),
    );
    const reviewPath = `/users/${login.userId}/reviews/${bookId}`;
    const reviewText = `Disposable release review ${randomUUID()}`;
    await request(reviewPath, "PUT", {
      difficulty: "APPROPRIATE",
      text: reviewText,
    });
    await request(reviewPath, "PUT", {
      difficulty: "HARD",
      text: reviewText + " updated",
    });
    const publicReviews = await request(`/books/${bookId}/reviews`);
    assert.ok(
      publicReviews.content.some(
        (r) => r.text === reviewText + " updated" && r.difficulty === "HARD",
      ),
    );
    const ownerToken = token;
    token = undefined;
    const other = await request("/auth/register", "POST", {
      email: `release-other-${randomUUID()}@example.invalid`,
      password: randomUUID() + "Aa1!",
      displayName: "Other test account",
    });
    token = other.accessToken;
    await request(
      `/users/${login.userId}/shelf/${bookId}`,
      "PUT",
      { status: "FINISHED", note: "Forbidden" },
      {},
      403,
    );
    await request(reviewPath, "DELETE", undefined, {}, 403);
    await request(
      `/learning-recommendations/${result.id}`,
      "GET",
      undefined,
      {},
      403,
    );
    await request("/auth/logout", "POST");
    token = ownerToken;
    await request(`/users/${login.userId}/shelf/${bookId}`, "DELETE");
    assert.ok(
      !(await request(`/users/${login.userId}/shelf`)).content.some(
        (e) => e.bookId === bookId,
      ),
    );
    assert.ok(
      (await request(`/books/${bookId}/reviews`)).content.some(
        (r) => r.text === reviewText + " updated",
      ),
      "Shelf removal preserves independently public review",
    );
    await request(reviewPath, "DELETE");
    assert.ok(
      !(await request(`/books/${bookId}/reviews`)).content.some(
        (r) => r.text === reviewText + " updated",
      ),
    );
  }
  await request("/auth/logout", "POST");
  await request("/me", "GET", undefined, {}, 401);
  console.log(
    JSON.stringify(
      {
        passed: true,
        scope: process.argv.includes("--account-only")
          ? "account-only; assessment/recommendation/shelf not tested"
          : "full",
        steps,
        facts,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify({ passed: false, message: error.message, steps }, null, 2),
  );
  process.exitCode = 1;
}
