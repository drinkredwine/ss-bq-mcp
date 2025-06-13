import { readFileSync } from "fs";

export interface GoogleAuthConfig {
  projectId?: string;
  keyFilename?: string;
  location?: string;
}

export class GoogleAuthManager {
  private config: GoogleAuthConfig;

  constructor() {
    this.config = {
      location: "US",
    };
  }

  /**
   * Initialize Google authentication from environment variables
   */
  initializeFromEnvironment(): GoogleAuthConfig {
    try {
      // Get credentials from environment variables
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (serviceAccountPath) {
        try {
          const serviceAccount = JSON.parse(
            readFileSync(serviceAccountPath, "utf8")
          );
          this.config.projectId = serviceAccount.project_id;
          this.config.keyFilename = serviceAccountPath;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `Warning: Could not read service account file: ${errorMessage}`
          );
        }
      }

      // Try other environment variables for project ID
      if (!this.config.projectId) {
        this.config.projectId =
          process.env.GOOGLE_CLOUD_PROJECT ||
          process.env.BQ_PROJECT_ID ||
          process.env.GCLOUD_PROJECT;
      }

      // Set location from environment
      this.config.location =
        process.env.BQ_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || "US";

      if (!this.config.projectId) {
        throw new Error(
          "Project ID is required. Either:\n" +
            "1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable, or\n" +
            "2. Set GOOGLE_CLOUD_PROJECT or BQ_PROJECT_ID environment variable"
        );
      }

      return this.config;
    } catch (error) {
      console.error(
        `[ERROR] Failed to initialize Google authentication:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): GoogleAuthConfig {
    return { ...this.config };
  }

  /**
   * Create Google Cloud client options
   */
  createClientOptions(): any {
    const options: any = {
      projectId: this.config.projectId,
    };

    if (this.config.keyFilename) {
      options.keyFilename = this.config.keyFilename;
    }

    if (this.config.location) {
      options.location = this.config.location;
    }

    return options;
  }

  /**
   * Validate that authentication is properly configured
   */
  validateAuth(): boolean {
    return !!(
      this.config.projectId &&
      (this.config.keyFilename || process.env.GOOGLE_APPLICATION_CREDENTIALS)
    );
  }
}
