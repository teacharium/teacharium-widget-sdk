/**
 * `teacharium publish`: upload a built bundle, creating the widget the first
 * time (its id is then saved to teacharium.json).
 */
import { createInterface } from "node:readline/promises";

import { ApiError, TeachariumApi, type ApiOrganization } from "./api.js";
import type { BuildResult } from "./build.js";
import { log } from "./log.js";
import { updateProject, type LoadedWidgetProject } from "./project.js";

export interface PublishOptions {
  /** Organization for a new widget (id or exact name). */
  org?: string;
}

async function chooseOrganization(
  organizations: ApiOrganization[],
  requested: string | undefined,
): Promise<ApiOrganization> {
  if (requested) {
    const match = organizations.find(
      (org) => org.id === requested || org.name === requested,
    );
    if (!match) {
      throw new Error(
        `No organization "${requested}". Yours: ${organizations
          .map((org) => `${org.name} (${org.id})`)
          .join(", ")}`,
      );
    }
    return match;
  }
  if (organizations.length === 1) return organizations[0];
  if (organizations.length === 0) {
    throw new Error("You are not a member of any organization.");
  }
  if (!process.stdin.isTTY) {
    throw new Error(
      `Choose an organization with --org: ${organizations
        .map((org) => `${org.name} (${org.id})`)
        .join(", ")}`,
    );
  }

  log.info("Which organization should own this widget?");
  organizations.forEach((org, index) =>
    log.info(`  ${index + 1}. ${org.name}${org.isDefault ? " (default)" : ""}`),
  );
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const answer = (await rl.question("Number: ")).trim();
      const choice = organizations[Number(answer) - 1];
      if (choice) return choice;
    }
  } finally {
    rl.close();
  }
}

/** Make sure the project has a widget to publish to, creating one if needed. */
export async function ensureWidget(
  project: LoadedWidgetProject,
  api: TeachariumApi,
  options: PublishOptions,
): Promise<LoadedWidgetProject> {
  if (project.widgetId) return project;

  const me = await api.whoami();
  const organization = await chooseOrganization(me.organizations, options.org);
  const widget = await api.createWidget({
    name: project.name,
    description: project.description,
    organizationId: organization.id,
  });
  log.success(`Created widget "${widget.name}" in ${organization.name}`);
  log.dim(`Saved widgetId to ${project.file}; commit it so everyone publishes to the same widget.`);
  return updateProject(project, { widgetId: widget.id });
}

export async function publishBuild(
  project: LoadedWidgetProject,
  api: TeachariumApi,
  build: BuildResult,
): Promise<void> {
  if (!project.widgetId) throw new Error("The project has no widgetId yet.");
  try {
    const result = await api.publish(project.widgetId, build.paths);
    log.success(
      `Published "${result.widget.name}" to ${api.apiUrl} (${result.environment}): ${result.components.join(", ")}`,
    );
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === "NOT_FOUND" || error.code === "VIBE_WIDGET") {
        throw new Error(
          `${error.message}\n(widgetId ${project.widgetId} on ${api.apiUrl})`,
        );
      }
      throw new Error(`Publish failed: ${error.message}`);
    }
    throw error;
  }
}
