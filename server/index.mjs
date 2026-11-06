import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 3001);
const DATA_FILE = resolve(dirname(fileURLToPath(import.meta.url)), "data/profiles.json");

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, headers);
  response.end(JSON.stringify(body));
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateProfile(profile) {
  if (!isObject(profile)) return "Profile body must be a JSON object";
  if (!Number.isInteger(profile.schemaVersion)) return "schemaVersion must be an integer";
  if (typeof profile.id !== "string" || profile.id.trim() === "") return "id is required";
  if (typeof profile.name !== "string" || profile.name.trim() === "") return "name is required";
  if (!isObject(profile.canvas)) return "canvas must be an object";
  if (!isFiniteNumber(profile.canvas.w) || profile.canvas.w <= 0) {
    return "canvas.w must be a positive number";
  }
  if (!isFiniteNumber(profile.canvas.h) || profile.canvas.h <= 0) {
    return "canvas.h must be a positive number";
  }
  if (!Array.isArray(profile.widgets)) return "widgets must be an array";

  for (const [index, widget] of profile.widgets.entries()) {
    if (!isObject(widget)) return `widgets[${index}] must be an object`;
    if (typeof widget.id !== "string" || widget.id.trim() === "") {
      return `widgets[${index}].id is required`;
    }
    if (typeof widget.type !== "string" || widget.type.trim() === "") {
      return `widgets[${index}].type is required`;
    }
    for (const field of ["x", "y", "w", "h"]) {
      if (!isFiniteNumber(widget[field])) {
        return `widgets[${index}].${field} must be a number`;
      }
    }
    if (widget.w <= 0 || widget.h <= 0) {
      return `widgets[${index}].w and h must be positive numbers`;
    }
  }

  return null;
}

async function readProfiles() {
  const contents = await readFile(DATA_FILE, "utf8");
  const profiles = JSON.parse(contents);
  if (!Array.isArray(profiles)) throw new Error("Profile storage must contain an array");
  return profiles;
}

async function writeProfiles(profiles) {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(profiles, null, 2)}\n`, "utf8");
}

function readRequestBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        rejectBody(new Error("Request body is too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolveBody(JSON.parse(body));
      } catch {
        rejectBody(new Error("Request body must be valid JSON"));
      }
    });
    request.on("error", rejectBody);
  });
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts[0] !== "configs" || parts.length > 2) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  try {
    const profiles = await readProfiles();

    if (request.method === "GET" && parts.length === 1) {
      sendJson(response, 200, profiles.map(({ id, name }) => ({ id, name })));
      return;
    }

    if (request.method === "GET" && parts.length === 2) {
      const profile = profiles.find((item) => item.id === decodeURIComponent(parts[1]));
      if (!profile) {
        sendJson(response, 404, { error: "Profile not found" });
        return;
      }
      sendJson(response, 200, profile);
      return;
    }

    if (request.method === "POST" && parts.length === 1) {
      const profile = await readRequestBody(request);
      const validationError = validateProfile(profile);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }
      if (profiles.some((item) => item.id === profile.id)) {
        sendJson(response, 409, { error: "Profile id already exists" });
        return;
      }
      profiles.push(profile);
      await writeProfiles(profiles);
      sendJson(response, 201, profile);
      return;
    }

    if (request.method === "PUT" && parts.length === 2) {
      const profileId = decodeURIComponent(parts[1]);
      const profile = await readRequestBody(request);
      const validationError = validateProfile(profile);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }
      if (profile.id !== profileId) {
        sendJson(response, 400, { error: "Body id must match URL id" });
        return;
      }
      const index = profiles.findIndex((item) => item.id === profileId);
      if (index === -1) {
        sendJson(response, 404, { error: "Profile not found" });
        return;
      }
      profiles[index] = profile;
      await writeProfiles(profiles);
      sendJson(response, 200, profile);
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Config server listening on http://localhost:${PORT}`);
});
