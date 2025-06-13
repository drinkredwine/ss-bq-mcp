declare module "facebook-nodejs-business-sdk" {
  export class FacebookAdsApi {
    static init(accessToken: string): void;
    static getDefaultApi(): FacebookAdsApi;
  }

  export class AdAccount {
    constructor(id: string);
    read(fields: string[]): Promise<any>;
    getCampaigns(fields: string[], params?: any): Promise<any>;
    static Fields: {
      id: string;
      name: string;
      account_status: string;
      currency: string;
      timezone_name: string;
      spend_cap: string;
      amount_spent: string;
      balance: string;
    };
  }

  export class Campaign {
    constructor(id: string);
    read(fields: string[]): Promise<any>;
    getAdSets(fields: string[], params?: any): Promise<any>;
    getInsights(fields: string[], params?: any): Promise<any>;
    static Fields: {
      id: string;
      name: string;
      status: string;
      objective: string;
      created_time: string;
      updated_time: string;
      start_time: string;
      stop_time: string;
      daily_budget: string;
      lifetime_budget: string;
      budget_remaining: string;
      spend_cap: string;
      bid_strategy: string;
      buying_type: string;
      can_use_spend_cap: string;
    };
  }

  export class AdSet {
    constructor(id: string);
    read(fields: string[]): Promise<any>;
    getAds(fields: string[], params?: any): Promise<any>;
    getInsights(fields: string[], params?: any): Promise<any>;
    static Fields: {
      id: string;
      name: string;
      status: string;
      created_time: string;
      updated_time: string;
      start_time: string;
      end_time: string;
      daily_budget: string;
      lifetime_budget: string;
      budget_remaining: string;
      bid_amount: string;
      billing_event: string;
      optimization_goal: string;
    };
  }

  export class Ad {
    constructor(id: string);
    read(fields: string[]): Promise<any>;
    getInsights(fields: string[], params?: any): Promise<any>;
    static Fields: {
      id: string;
      name: string;
      status: string;
      created_time: string;
      updated_time: string;
      creative: string;
      tracking_specs: string;
      conversion_specs: string;
    };
  }
}
