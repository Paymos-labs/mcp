// GENERATED FILE — do not edit by hand. Regenerate with: npm run build:resources
// Source: scripts/merchant-tools-catalog.json (compiled from IMerchantMcpToolModule).

export interface MerchantToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

export const MERCHANT_TOOLS: readonly MerchantToolDefinition[] = [
  {
    "name": "get_connection_status",
    "description": "Read the merchant, authorized environments and expiry of this Paymos MCP connection.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_activate_webhook_endpoint",
    "description": "Activate a merchant webhook endpoint.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "endpoint_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "endpoint_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_archive_project",
    "description": "Archive a merchant project.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "project_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "project_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_archive_widget_price",
    "description": "Archive an owned widget price in the selected project.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "project_id": {
              "type": "string"
            },
            "price_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "project_id",
            "price_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_begin_register_passkey",
    "description": "Open the native passkey registration page.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_begin_two_factor_setup",
    "description": "Open the native authenticator setup page.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_bind_project_cms_connection",
    "description": "Bind an owned project to an official CMS store.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "project_id": {
              "type": "string"
            },
            "plugin_slug": {
              "type": "string"
            },
            "store_url": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "project_id",
            "plugin_slug",
            "store_url"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_block_payment_channel",
    "description": "Block a payment channel.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "payment_channel_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "payment_channel_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_cancel_invoice",
    "description": "Cancel an invoice with a reason. Supply an operation_id for retries.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": "string"
            },
            "reason": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "invoice_id",
            "reason",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_cancel_withdrawal",
    "description": "Cancel a withdrawal that can still be cancelled.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "withdrawal_id": {
              "type": "string"
            },
            "reason": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "withdrawal_id",
            "reason",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_close_project_quickstart",
    "description": "Close the project quickstart in the selected environment.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "project_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "project_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_complete_register_passkey",
    "description": "Continue passkey registration with the native browser ceremony.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_confirm_payment",
    "description": "Select the payment currency and network for an invoice and prepare its payment address. Supply an operation_id for retries.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": "string"
            },
            "currency": {
              "type": "string"
            },
            "network": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "invoice_id",
            "currency",
            "network",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_copy_membership_invite_link",
    "description": "Deliver a pending membership invitation link through the prepared installer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "membership_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "delivery": {
              "type": "object",
              "properties": {
                "request_id": {
                  "type": "string"
                },
                "challenge": {
                  "type": "string"
                }
              },
              "required": [
                "request_id",
                "challenge"
              ],
              "additionalProperties": false
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "membership_id",
            "operation_id",
            "delivery"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_create_api_credential",
    "description": "Create a merchant API credential and deliver it through the prepared installer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "key_type": {
              "type": "string",
              "enum": [
                "Payment",
                "Payout"
              ]
            },
            "delivery": {
              "type": "object",
              "properties": {
                "request_id": {
                  "type": "string"
                },
                "challenge": {
                  "type": "string"
                }
              },
              "required": [
                "request_id",
                "challenge"
              ],
              "additionalProperties": false
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "key_type",
            "delivery"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_create_dashboard_refund",
    "description": "Refund a paid invoice to its verified sender. Use mode full or overpayment and a stable external order ID.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": "string"
            },
            "mode": {
              "type": "string"
            },
            "external_order_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "invoice_id",
            "mode",
            "external_order_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_create_invoice",
    "description": "Create an invoice and return its checkout link. Send amount and optional product unit amounts as decimal strings. Supply an operation_id for retries.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "currency": {
              "type": "string"
            },
            "amount": {
              "type": "string"
            },
            "external_order_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "network": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "customer_fee_percent": {
              "type": [
                "integer",
                "null"
              ],
              "default": null
            },
            "client_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "products": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "object",
                "properties": {
                  "title": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "default": null
                  },
                  "description": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "default": null
                  },
                  "quantity": {
                    "type": [
                      "integer",
                      "null"
                    ],
                    "default": null
                  },
                  "unit_amount": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "default": null
                  }
                },
                "additionalProperties": false
              },
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "project_id",
            "currency",
            "amount",
            "external_order_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_create_mass_withdrawal",
    "description": "Create a production withdrawal run to active whitelist entries. Supply the maximum total debit from your quote.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "currency": {
              "type": "string"
            },
            "network": {
              "type": "string"
            },
            "rows": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "whitelisted_address_id": {
                    "type": "string"
                  },
                  "amount": {
                    "type": "number"
                  }
                },
                "required": [
                  "whitelisted_address_id",
                  "amount"
                ],
                "additionalProperties": false
              }
            },
            "maximum_total_debit": {
              "type": "number"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "currency",
            "network",
            "rows",
            "maximum_total_debit",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_create_mass_withdrawal_to_addresses",
    "description": "Create a production withdrawal run with typed recipients when the withdrawal whitelist is off. Supply the quoted maximum total debit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "currency": {
              "type": "string"
            },
            "network": {
              "type": "string"
            },
            "rows": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "amount": {
                    "type": "number"
                  },
                  "address": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "default": null
                  },
                  "whitelisted_address_id": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "default": null
                  }
                },
                "required": [
                  "amount"
                ],
                "additionalProperties": false
              }
            },
            "maximum_total_debit": {
              "type": "number"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "currency",
            "network",
            "rows",
            "maximum_total_debit",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_create_payment_channel",
    "description": "Create or retrieve a payment channel for this project and external ID.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "project_id": {
              "type": "string"
            },
            "external_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "project_id",
            "external_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_create_project",
    "description": "Create a project with the native dashboard form.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "form": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "string"
                },
                "kind": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "Invoices",
                    "ClientWallets",
                    null
                  ]
                },
                "website_url": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "success_url": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "fail_url": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "customer_fee_percent": {
                  "type": "integer"
                },
                "underpayment_policy": {
                  "type": "object",
                  "properties": {
                    "tolerance_percent": {
                      "type": "number"
                    }
                  },
                  "required": [
                    "tolerance_percent"
                  ],
                  "additionalProperties": false
                },
                "max_concurrent_deposits_per_client": {
                  "type": [
                    "integer",
                    "null"
                  ]
                },
                "default_currency": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "USD",
                    "EUR",
                    "GBP",
                    "CHF",
                    "CAD",
                    "AUD",
                    "NZD",
                    "JPY",
                    "PLN",
                    "CZK",
                    "DKK",
                    "SEK",
                    "NOK",
                    "HUF",
                    "RUB",
                    "UAH",
                    "GEL",
                    "CNY",
                    "HKD",
                    "KRW",
                    "INR",
                    "IDR",
                    "MYR",
                    "PHP",
                    "THB",
                    "VND",
                    "PKR",
                    "SGD",
                    "BRL",
                    "MXN",
                    "ARS",
                    "CLP",
                    "TRY",
                    "AED",
                    "ILS",
                    "NGN",
                    "ZAR",
                    "BDT",
                    "BHD",
                    "BMD",
                    "KWD",
                    "LKR",
                    "MMK",
                    "SAR",
                    "TWD",
                    null
                  ]
                },
                "enabled_symbols": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "enum": [
                      "USDT",
                      "USDC",
                      "ETH",
                      "TRX",
                      "BNB",
                      "POL",
                      "GRAM",
                      "DAI",
                      "USD1",
                      "SOL",
                      "AVAX",
                      "NEAR",
                      "APT",
                      "SUI",
                      "XPL",
                      "ARB",
                      "XAUT"
                    ]
                  }
                },
                "integration_language": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "cms_plugin_slug": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "checkout_channel": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "Api",
                    "TelegramBot",
                    "Cms",
                    "Terminal",
                    "LowCode",
                    "HostToHost",
                    null
                  ]
                }
              },
              "additionalProperties": false
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "form"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_create_sandbox_withdrawal",
    "description": "Create a Sandbox withdrawal using the configured destination policy.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "external_order_id": {
              "type": "string"
            },
            "currency": {
              "type": "string"
            },
            "network": {
              "type": "string"
            },
            "destination_address": {
              "type": "string"
            },
            "amount": {
              "type": "number"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "external_order_id",
            "currency",
            "network",
            "destination_address",
            "amount",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_create_webhook_endpoint",
    "description": "Create a validated webhook endpoint and deliver its signing secret through the prepared installer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "url": {
              "type": "string"
            },
            "delivery": {
              "type": "object",
              "properties": {
                "request_id": {
                  "type": "string"
                },
                "challenge": {
                  "type": "string"
                }
              },
              "required": [
                "request_id",
                "challenge"
              ],
              "additionalProperties": false
            },
            "enabled_categories": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string",
                "enum": [
                  "Invoice",
                  "Withdrawal",
                  "PaymentChannel"
                ]
              },
              "default": null
            },
            "selected_project_ids": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "withdrawal_scope": {
              "type": "string",
              "enum": [
                "Merchant",
                "InvoiceProjects"
              ],
              "default": "Merchant"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "url",
            "delivery"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_create_widget_price",
    "description": "Create a widget price for an owned project.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "project_id": {
              "type": "string"
            },
            "name": {
              "type": "string"
            },
            "amount": {
              "type": "string"
            },
            "currency": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "project_id",
            "name",
            "amount",
            "currency"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_deactivate_webhook_endpoint",
    "description": "Deactivate a merchant webhook endpoint.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "endpoint_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "endpoint_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_delete_storage_objects",
    "description": "Remove owned project logo or account avatar objects using native storage cleanup.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "urls": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "urls",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_delete_webhook_endpoint",
    "description": "Delete a merchant webhook endpoint.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "endpoint_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "endpoint_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_disable_two_factor",
    "description": "Disable an authenticator through the native browser settings.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_download_terminal_qr",
    "description": "Prepare the native Terminal QR PNG for proof-bound download.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "project_id": {
              "type": "string"
            },
            "delivery": {
              "type": "object",
              "properties": {
                "request_id": {
                  "type": "string"
                },
                "challenge": {
                  "type": "string"
                }
              },
              "required": [
                "request_id",
                "challenge"
              ],
              "additionalProperties": false
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "project_id",
            "delivery"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_enable_two_factor",
    "description": "Enable an authenticator through the native browser settings.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_enable_whitelist",
    "description": "Enable the merchant's withdrawal whitelist.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_export_balance_csv",
    "description": "Prepare a private CSV of dashboard balance operations.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "delivery": {
              "type": "object",
              "properties": {
                "request_id": {
                  "type": "string"
                },
                "challenge": {
                  "type": "string"
                }
              },
              "required": [
                "request_id",
                "challenge"
              ],
              "additionalProperties": false
            },
            "types": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string",
                "enum": [
                  "Withdrawal",
                  "Late",
                  "TerminalInvoice",
                  "SymbolMismatch",
                  "MissingInvoice",
                  "MintWithoutDeposit",
                  "Referral",
                  "InvoicePayment",
                  "ChannelDeposit",
                  "Refund",
                  "Adjustment"
                ]
              },
              "default": null
            },
            "search": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "since": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "until": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "sort_by": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "sort_desc": {
              "type": "boolean",
              "default": true
            },
            "tokens": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "time_zone_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "report_locale": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "maximum_rows": {
              "type": "integer",
              "default": 10000
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "delivery"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_export_channel_deposits_csv",
    "description": "Prepare a private CSV of dashboard channel deposits.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "delivery": {
              "type": "object",
              "properties": {
                "request_id": {
                  "type": "string"
                },
                "challenge": {
                  "type": "string"
                }
              },
              "required": [
                "request_id",
                "challenge"
              ],
              "additionalProperties": false
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "payment_channel_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "statuses": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string",
                "enum": [
                  "Confirming",
                  "Reorged",
                  "Confirmed"
                ]
              },
              "default": null
            },
            "search": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "since": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "until": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "sort_by": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "sort_desc": {
              "type": "boolean",
              "default": true
            },
            "tokens": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "time_zone_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "report_locale": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "maximum_rows": {
              "type": "integer",
              "default": 10000
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "delivery"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_export_payments_csv",
    "description": "Prepare a private CSV of dashboard payments.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "delivery": {
              "type": "object",
              "properties": {
                "request_id": {
                  "type": "string"
                },
                "challenge": {
                  "type": "string"
                }
              },
              "required": [
                "request_id",
                "challenge"
              ],
              "additionalProperties": false
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "statuses": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string",
                "enum": [
                  "AwaitingClient",
                  "AwaitingPayment",
                  "Confirming",
                  "UnderpaidWaiting",
                  "Paid",
                  "PaidOver",
                  "Underpaid",
                  "Expired",
                  "Cancelled"
                ]
              },
              "default": null
            },
            "search": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "since": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "until": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "sort_by": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "sort_desc": {
              "type": "boolean",
              "default": true
            },
            "tokens": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "time_zone_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "report_locale": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "maximum_rows": {
              "type": "integer",
              "default": 10000
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "delivery"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_active_dashboard_conversation",
    "description": "Find your current support conversation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_analytics",
    "description": "Read payment analytics for a project in the selected environment. Timezone defaults to UTC.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "since": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "period_length": {
              "$comment": "Represents a System.TimeSpan value.",
              "type": [
                "string",
                "null"
              ],
              "pattern": "^-?(\\d+\\.)?\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,7})?$",
              "default": null
            },
            "timezone": {
              "type": [
                "string",
                "null"
              ],
              "default": "UTC"
            },
            "until": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "project_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_available_withdrawal_tokens",
    "description": "List available withdrawal currencies, networks, fees and remaining withdrawal slots.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_balance_page",
    "description": "Read merchant balances and the withdrawal whitelist state in the selected environment.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_cms_plugin_release",
    "description": "Find the latest official CMS plugin ZIP release by supported slug.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "plugin_slug": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "plugin_slug"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_conversation_messages",
    "description": "Read up to 100 support messages. Use a returned order_key to page backward.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "conversation_id": {
              "type": "string"
            },
            "cursor": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "take": {
              "type": "integer",
              "default": 50
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "conversation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_dashboard_refund_links",
    "description": "Find invoice and mode for the supplied withdrawal IDs.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "withdrawal_ids": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "withdrawal_ids"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_dashboard_refund_quote",
    "description": "Read invoice refund eligibility, sender, fee and total before requesting a refund.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": "string"
            },
            "external_order_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "invoice_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_dashboard_unread_count",
    "description": "Count unread messages in your dashboard support conversation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_invoice_detail",
    "description": "Read invoice details, checkout link, product lines and payment receipts.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "invoice_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_invoice_overview",
    "description": "Read invoice totals and recent invoices, optionally filtered by project and period.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "since": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "period_length": {
              "$comment": "Represents a System.TimeSpan value.",
              "type": [
                "string",
                "null"
              ],
              "pattern": "^-?(\\d+\\.)?\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,7})?$",
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_invoice_timeline",
    "description": "Read the status history of an invoice.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "invoice_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_memberships",
    "description": "List members, roles, invitation state and permissions for the current merchant.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_merchant_analytics",
    "description": "Read merchant payment analytics across projects or for one project in the selected environment. Timezone defaults to UTC.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "since": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "period_length": {
              "$comment": "Represents a System.TimeSpan value.",
              "type": [
                "string",
                "null"
              ],
              "pattern": "^-?(\\d+\\.)?\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,7})?$",
              "default": null
            },
            "timezone": {
              "type": [
                "string",
                "null"
              ],
              "default": "UTC"
            },
            "until": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_merchant_api_credential_search_detail",
    "description": "Read the production search result for one API credential.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "credential_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "credential_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_merchant_credentials",
    "description": "List masked API credential metadata in the selected environment.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_merchant_membership_search_detail",
    "description": "Read one merchant membership search result.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "membership_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "membership_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_merchant_platform_fee_percent",
    "description": "Read the merchant platform fee percentage.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_merchant_profile",
    "description": "Read the business profile and its current withdrawal whitelist policy.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_merchant_projects",
    "description": "List projects in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_merchant_projects_with_stats",
    "description": "List projects and their dashboard seven-day statistics.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_merchant_whitelisted_address_search_detail",
    "description": "Read one merchant withdrawal whitelist entry in Production.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_merchant_widget_price_search_detail",
    "description": "Read the production widget price search detail.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "price_id": {
              "type": "string"
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "price_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_my_external_logins",
    "description": "List login providers attached to the current account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_my_login_history",
    "description": "List recent security events for the current account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "limit": {
              "type": "integer",
              "default": 50
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_my_passkeys",
    "description": "List current account passkey metadata.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_my_profile",
    "description": "Read the current account profile.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_notification_feed",
    "description": "Read your paginated dashboard notification inbox.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "before": {
              "type": [
                "object",
                "null"
              ],
              "properties": {
                "created_at": {
                  "type": "string",
                  "format": "date-time"
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "created_at",
                "id"
              ],
              "additionalProperties": false,
              "default": null
            },
            "page_size": {
              "type": "integer",
              "default": 50
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_notification_preferences",
    "description": "Read the business notification toggles configured for your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_partnership_overview",
    "description": "Read your referral link, partnership tier and reward overview.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_payment_channel",
    "description": "Read a payment channel and its available networks.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "payment_channel_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "payment_channel_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_payment_channel_deposit",
    "description": "Read one payment channel deposit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "deposit_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "deposit_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_payment_channel_deposit_timeline",
    "description": "Read the merchant-visible status timeline of a channel deposit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "deposit_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "deposit_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_project_by_id",
    "description": "Read settings for a project in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "project_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_project_payment_api_key",
    "description": "Get a project's publishable payment key for the selected environment.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "project_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_project_quickstart",
    "description": "Read project quickstart progress in the selected environment.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "project_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_project_widget",
    "description": "Read saved checkout appearance and the publishable payment key.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "project_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_recent_notifications",
    "description": "Read your most recent dashboard notifications.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "limit": {
              "type": "integer",
              "default": 5
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_recent_payment_channel_deposits",
    "description": "Read recent confirmed payment-channel deposits in the selected environment. Take accepts 1 to 50.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "take": {
              "type": "integer",
              "default": 5
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_terminal_links",
    "description": "Read the publishable cashier URL and dashboard preview for a terminal project.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "project_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_two_factor_status",
    "description": "Read whether an authenticator is configured on the current account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_unread_chats_count",
    "description": "Count your unread support conversations.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_unread_notifications_indicator",
    "description": "Check whether you have unread dashboard notifications.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_webhook_event_detail",
    "description": "Read one webhook event and its delivery attempt summary.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "event_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "event_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_whitelisted_addresses",
    "description": "Read active withdrawal whitelist entries for recipient selection.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_whitelisted_addresses_page",
    "description": "Read a page of active withdrawal whitelist entries.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "page": {
              "type": "integer",
              "default": 1
            },
            "page_size": {
              "type": "integer",
              "default": 10
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_widget_embed",
    "description": "Build the low-code SDK snippet for a project's active price or dynamic currency.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "price_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "currency": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "USD",
                "EUR",
                "GBP",
                "CHF",
                "CAD",
                "AUD",
                "NZD",
                "JPY",
                "PLN",
                "CZK",
                "DKK",
                "SEK",
                "NOK",
                "HUF",
                "RUB",
                "UAH",
                "GEL",
                "CNY",
                "HKD",
                "KRW",
                "INR",
                "IDR",
                "MYR",
                "PHP",
                "THB",
                "VND",
                "PKR",
                "SGD",
                "BRL",
                "MXN",
                "ARS",
                "CLP",
                "TRY",
                "AED",
                "ILS",
                "NGN",
                "ZAR",
                "BDT",
                "BHD",
                "BMD",
                "KWD",
                "LKR",
                "MMK",
                "SAR",
                "TWD",
                null
              ],
              "default": null
            },
            "mode": {
              "type": "string",
              "default": "iframe"
            },
            "redirect_target": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "custom_button": {
              "type": "boolean",
              "default": false
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "project_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_withdrawal_detail",
    "description": "Read the details and status of a merchant withdrawal.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "withdrawal_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "withdrawal_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_withdrawal_form_context",
    "description": "Read balances and the destination policy for creating a withdrawal.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_get_withdrawal_timeline",
    "description": "Read the status changes of a merchant withdrawal.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "withdrawal_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "withdrawal_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_has_any_invoices",
    "description": "Check whether a project has any invoices in the selected environment.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "project_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_initialize_project_widget",
    "description": "Initialize checkout appearance. The default form type is classic.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "project_id": {
              "type": "string"
            },
            "appearance": {
              "type": "object",
              "properties": {
                "style": {
                  "type": "string"
                },
                "accent_color": {
                  "type": "string"
                },
                "background_color": {
                  "type": "string"
                },
                "surface_color": {
                  "type": "string"
                },
                "text_color": {
                  "type": "string"
                },
                "muted_color": {
                  "type": "string"
                },
                "radius": {
                  "type": "integer"
                },
                "form_type": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "default": null
                },
                "allowed_origin": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "default": null
                }
              },
              "required": [
                "style",
                "accent_color",
                "background_color",
                "surface_color",
                "text_color",
                "muted_color",
                "radius"
              ],
              "additionalProperties": false
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "project_id",
            "appearance"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_invite_membership",
    "description": "Invite members through the native team invitation workflow.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "emails": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "role": {
              "type": "string",
              "enum": [
                "Owner",
                "Admin",
                "Finance",
                "Developer",
                "Custom"
              ]
            },
            "extra_permissions": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string",
                "enum": [
                  "ManageTeam",
                  "ChangeMembershipRole",
                  "ViewTeam",
                  "ViewBalance",
                  "Withdraw",
                  "ViewWithdrawals",
                  "ManageWhitelist",
                  "ViewPayments",
                  "CreatePayments",
                  "RotateSecrets",
                  "ManageProfile",
                  "ViewProfile",
                  "ViewProjects",
                  "ManageProjects",
                  "ViewPartnership",
                  "ViewIntegrations",
                  "ManageIntegrations",
                  "ManageSupport",
                  "BasicAccess"
                ]
              },
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "emails",
            "role"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_leave_membership",
    "description": "Leave the merchant if permitted by the current membership policy.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_link_google",
    "description": "Open the native account page to connect Google.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_link_telegram",
    "description": "Open the native account page to connect Telegram.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_list_accepted_catalog_tokens",
    "description": "Read the accepted token catalog for the selected environment.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_list_api_usage_logs",
    "description": "Read merchant API usage without credentials or request bodies.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "page": {
              "type": "integer",
              "default": 1
            },
            "page_size": {
              "type": "integer",
              "default": 50
            },
            "credential_ids": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "status": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "All",
                "Success",
                "ClientError",
                "ServerError",
                null
              ],
              "default": null
            },
            "from": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "to": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_list_balance_operations",
    "description": "List balance operations with the dashboard's search, filters and sorting.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "types": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string",
                "enum": [
                  "Withdrawal",
                  "Late",
                  "TerminalInvoice",
                  "SymbolMismatch",
                  "MissingInvoice",
                  "MintWithoutDeposit",
                  "Referral",
                  "InvoicePayment",
                  "ChannelDeposit",
                  "Refund",
                  "Adjustment"
                ]
              },
              "default": null
            },
            "search": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "since": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "until": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "page": {
              "type": "integer",
              "default": 1
            },
            "page_size": {
              "type": "integer",
              "default": 20
            },
            "sort_by": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "sort_desc": {
              "type": "boolean",
              "default": true
            },
            "tokens": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_list_dashboard_refunds",
    "description": "List merchant refunds with an optional invoice filter and a cursor.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "cursor_created_at": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "cursor_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_list_invoices",
    "description": "List invoices in the selected environment, with optional project, status, search, date and token filters.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "statuses": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string",
                "enum": [
                  "AwaitingClient",
                  "AwaitingPayment",
                  "Confirming",
                  "UnderpaidWaiting",
                  "Paid",
                  "PaidOver",
                  "Underpaid",
                  "Expired",
                  "Cancelled"
                ]
              },
              "default": null
            },
            "search": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "page": {
              "type": "integer",
              "default": 1
            },
            "page_size": {
              "type": "integer",
              "default": 20
            },
            "since": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "sort_by": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "sort_desc": {
              "type": "boolean",
              "default": true
            },
            "until": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "tokens": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_list_merchant_cases",
    "description": "List support conversations for your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "search": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "page": {
              "type": "integer",
              "default": 1
            },
            "page_size": {
              "type": "integer",
              "default": 20
            },
            "sort_by": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "sort_desc": {
              "type": "boolean",
              "default": true
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_list_payment_channel_deposit_history",
    "description": "List payment channel deposits with their native filters and pagination.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "payment_channel_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "search": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "statuses": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string",
                "enum": [
                  "Confirming",
                  "Reorged",
                  "Confirmed"
                ]
              },
              "default": null
            },
            "created_from": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "created_to": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "cursor_created_at": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "cursor_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "limit": {
              "type": "integer",
              "default": 20
            },
            "offset": {
              "type": "integer",
              "default": 0
            },
            "include_total_count": {
              "type": "boolean",
              "default": false
            },
            "sort_by": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "sort_desc": {
              "type": "boolean",
              "default": true
            },
            "tokens": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_list_payment_channels",
    "description": "List payment channels with their native filters and pagination.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "statuses": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string",
                "enum": [
                  "Active",
                  "Blocked",
                  "Provisioning"
                ]
              },
              "default": null
            },
            "external_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "cursor_created_at": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time",
              "default": null
            },
            "cursor_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "limit": {
              "type": "integer",
              "default": 20
            },
            "offset": {
              "type": "integer",
              "default": 0
            },
            "include_total_count": {
              "type": "boolean",
              "default": false
            },
            "include_deposit_counts": {
              "type": "boolean",
              "default": false
            },
            "sort_by": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "sort_desc": {
              "type": "boolean",
              "default": true
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_list_project_widget_prices",
    "description": "List active prices for the selected project.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "project_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_list_webhook_endpoints",
    "description": "List webhook configurations with masked signing metadata.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_list_webhook_event_types",
    "description": "List event types observed for the selected environment.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_list_webhook_events",
    "description": "List webhook events and delivery outcomes in the selected environment.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "page": {
              "type": "integer",
              "default": 1
            },
            "page_size": {
              "type": "integer",
              "default": 50
            },
            "statuses": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string",
                "enum": [
                  "Pending",
                  "Delivered",
                  "Failed",
                  "Undeliverable"
                ]
              },
              "default": null
            },
            "event_types": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "endpoint_ids": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "search": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_mark_all_notifications_read",
    "description": "Mark all notifications in your dashboard inbox as read.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_mark_conversation_read",
    "description": "Mark your support conversation as read through the last message you received.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "conversation_id": {
              "type": "string"
            },
            "read_through_message_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "conversation_id",
            "read_through_message_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_mark_notification_read",
    "description": "Mark a notification in your dashboard inbox as read.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "message_id": {
              "type": "string",
              "format": "uuid"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "message_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_api_credential_exists",
    "description": "Check whether an API credential is visible in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_conversation_exists",
    "description": "Check whether a conversation is visible in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_incoming_transfer_exists",
    "description": "Find the invoice or channel deposit for a payment transfer visible in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_invoice_by_external_order_id",
    "description": "Find an invoice by its external order id.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "external_order_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "external_order_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_invoice_exists",
    "description": "Check whether an invoice is visible in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_membership_exists",
    "description": "Check whether a team membership is visible in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_payment_channel_deposit_exists",
    "description": "Check whether a channel deposit is visible in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_payment_channel_exists",
    "description": "Check whether a payment channel is visible in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_project_exists",
    "description": "Check whether a project belongs to your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_self_exists",
    "description": "Check whether an id identifies your current merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_webhook_endpoint_exists",
    "description": "Check whether a webhook endpoint is visible in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_webhook_event_exists",
    "description": "Check whether a webhook event is visible in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_whitelisted_address_exists",
    "description": "Check whether a withdrawal whitelist entry is visible in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_widget_price_exists",
    "description": "Find a widget price visible in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "raw_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "raw_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_withdrawal_by_external_order_id",
    "description": "Find a withdrawal by its external order id.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "external_order_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "external_order_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_merchant_withdrawal_exists",
    "description": "Check whether a withdrawal is visible in your merchant account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_preview_whitelist_import",
    "description": "Check CSV text for withdrawal whitelist import and report row issues. This is a preview.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "file_text": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "file_text"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_remove_membership",
    "description": "Remove a merchant team member under the native role rules.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "membership_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "membership_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_remove_passkey",
    "description": "Open the native passkey management page to remove a passkey.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_replay_webhook_event",
    "description": "Replay one stored webhook event under its native delivery and review rules.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "event_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "event_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_request_whitelist_opt_out",
    "description": "Request withdrawal whitelist opt-out through the merchant's approval process.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_resend_membership_invite",
    "description": "Resend a pending invitation and check its observed delivery status.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "membership_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "membership_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_resolve_withdrawal_destination_fees",
    "description": "Quote recipient-specific withdrawal fees using the active destination policy.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "currency": {
              "type": "string"
            },
            "network": {
              "type": "string"
            },
            "whitelisted_address_ids": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "addresses": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "currency",
            "network"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_restore_project",
    "description": "Restore an archived merchant project.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "project_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "project_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_reveal_api_credential",
    "description": "Deliver an existing active merchant API credential through the prepared installer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "credential_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "delivery": {
              "type": "object",
              "properties": {
                "request_id": {
                  "type": "string"
                },
                "challenge": {
                  "type": "string"
                }
              },
              "required": [
                "request_id",
                "challenge"
              ],
              "additionalProperties": false
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "credential_id",
            "operation_id",
            "delivery"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_reveal_webhook_secret",
    "description": "Deliver an existing webhook signing secret through the prepared installer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "endpoint_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "delivery": {
              "type": "object",
              "properties": {
                "request_id": {
                  "type": "string"
                },
                "challenge": {
                  "type": "string"
                }
              },
              "required": [
                "request_id",
                "challenge"
              ],
              "additionalProperties": false
            },
            "without_grace_period": {
              "type": "boolean",
              "default": false
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "endpoint_id",
            "operation_id",
            "delivery"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_revoke_api_credential",
    "description": "Revoke one merchant API credential.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "credential_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "credential_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_revoke_membership",
    "description": "Revoke a pending membership or active team member under the native role rules.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "membership_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "membership_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_revoke_whitelisted_address",
    "description": "Revoke one existing withdrawal whitelist entry.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "address_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "address_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_revoke_whitelisted_addresses",
    "description": "Revoke existing withdrawal whitelist entries in one request.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "address_ids": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "address_ids",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_rotate_api_credential_secret",
    "description": "Rotate a merchant API credential and deliver its replacement through the prepared installer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "credential_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "delivery": {
              "type": "object",
              "properties": {
                "request_id": {
                  "type": "string"
                },
                "challenge": {
                  "type": "string"
                }
              },
              "required": [
                "request_id",
                "challenge"
              ],
              "additionalProperties": false
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "credential_id",
            "operation_id",
            "delivery"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_rotate_webhook_secret",
    "description": "Rotate the signing secret of an existing webhook through the prepared installer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "endpoint_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "delivery": {
              "type": "object",
              "properties": {
                "request_id": {
                  "type": "string"
                },
                "challenge": {
                  "type": "string"
                }
              },
              "required": [
                "request_id",
                "challenge"
              ],
              "additionalProperties": false
            },
            "without_grace_period": {
              "type": "boolean",
              "default": false
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "endpoint_id",
            "operation_id",
            "delivery"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_search_merchant_global",
    "description": "Search your merchant dashboard with an optional language for result labels.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string"
            },
            "per_category_limit": {
              "type": "integer",
              "default": 5
            },
            "culture": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "query"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_send_conversation_message",
    "description": "Send the supplied message to Paymos support in the selected conversation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "conversation_id": {
              "type": "string"
            },
            "text": {
              "type": "string"
            },
            "locale": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "conversation_id",
            "text",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_set_conversation_typing",
    "description": "Publish a temporary typing indicator in your support conversation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "conversation_id": {
              "type": "string"
            },
            "text": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "is_typing": {
              "type": [
                "boolean",
                "null"
              ],
              "default": null
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "conversation_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_set_culture",
    "description": "Save the preferred dashboard language of the authenticated account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "culture": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "culture",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_set_enabled_tokens",
    "description": "Set the project's accepted tokens and optional payment currencies.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "project_id": {
              "type": "string"
            },
            "enabled_symbols": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "USDT",
                  "USDC",
                  "ETH",
                  "TRX",
                  "BNB",
                  "POL",
                  "GRAM",
                  "DAI",
                  "USD1",
                  "SOL",
                  "AVAX",
                  "NEAR",
                  "APT",
                  "SUI",
                  "XPL",
                  "ARB",
                  "XAUT"
                ]
              }
            },
            "payment_options": {
              "type": [
                "object",
                "null"
              ],
              "properties": {
                "currencies": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "enum": [
                      "USD",
                      "EUR",
                      "GBP",
                      "CHF",
                      "CAD",
                      "AUD",
                      "NZD",
                      "JPY",
                      "PLN",
                      "CZK",
                      "DKK",
                      "SEK",
                      "NOK",
                      "HUF",
                      "RUB",
                      "UAH",
                      "GEL",
                      "CNY",
                      "HKD",
                      "KRW",
                      "INR",
                      "IDR",
                      "MYR",
                      "PHP",
                      "THB",
                      "VND",
                      "PKR",
                      "SGD",
                      "BRL",
                      "MXN",
                      "ARS",
                      "CLP",
                      "TRY",
                      "AED",
                      "ILS",
                      "NGN",
                      "ZAR",
                      "BDT",
                      "BHD",
                      "BMD",
                      "KWD",
                      "LKR",
                      "MMK",
                      "SAR",
                      "TWD"
                    ]
                  }
                },
                "default_currency": {
                  "type": "string",
                  "enum": [
                    "USD",
                    "EUR",
                    "GBP",
                    "CHF",
                    "CAD",
                    "AUD",
                    "NZD",
                    "JPY",
                    "PLN",
                    "CZK",
                    "DKK",
                    "SEK",
                    "NOK",
                    "HUF",
                    "RUB",
                    "UAH",
                    "GEL",
                    "CNY",
                    "HKD",
                    "KRW",
                    "INR",
                    "IDR",
                    "MYR",
                    "PHP",
                    "THB",
                    "VND",
                    "PKR",
                    "SGD",
                    "BRL",
                    "MXN",
                    "ARS",
                    "CLP",
                    "TRY",
                    "AED",
                    "ILS",
                    "NGN",
                    "ZAR",
                    "BDT",
                    "BHD",
                    "BMD",
                    "KWD",
                    "LKR",
                    "MMK",
                    "SAR",
                    "TWD"
                  ]
                },
                "networks": {
                  "type": [
                    "array",
                    "null"
                  ],
                  "items": {
                    "type": "string"
                  },
                  "default": null
                }
              },
              "required": [
                "currencies",
                "default_currency"
              ],
              "additionalProperties": false,
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "project_id",
            "enabled_symbols"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_set_ip_whitelist",
    "description": "Update the IP and CIDR restrictions for a merchant API credential.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "credential_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "ips": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "credential_id",
            "operation_id",
            "ips"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_set_notification_preference",
    "description": "Set a business notification category on or off.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "category": {
              "type": "string",
              "enum": [
                "WithdrawalCreated",
                "WithdrawalCompleted",
                "MembershipAccepted",
                "SupportNewMessageObsolete",
                "WebhookEventDeliveryFailed",
                "ProductUpdates",
                "WithdrawalFailed",
                "Invoices"
              ]
            },
            "enabled": {
              "type": "boolean"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "category",
            "enabled",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_set_preferred_environment",
    "description": "Save a dashboard environment preference within this connection's authorized environments.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "environment": {
              "type": "string",
              "enum": [
                "Production",
                "Sandbox"
              ]
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            }
          },
          "required": [
            "environment",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_set_preferred_project",
    "description": "Save your dashboard's preferred project.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "project_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_sign_out_everywhere",
    "description": "Sign out other sessions while preserving the initiating merchant MCP connection.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_simulate_invoice_refund",
    "description": "Simulate completion of an invoice refund in Sandbox.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": "string"
            },
            "refund_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "invoice_id",
            "refund_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_simulate_payment",
    "description": "Simulate a payment stage for a Sandbox invoice. Supply an operation_id for retries.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": "string"
            },
            "stage": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "invoice_id",
            "stage",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_simulate_payment_channel_deposit",
    "description": "Simulate a deposit on an existing Sandbox payment channel.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "payment_channel_id": {
              "type": "string"
            },
            "amount": {
              "type": "number"
            },
            "currency": {
              "type": "string",
              "enum": [
                "USDT",
                "USDC",
                "ETH",
                "TRX",
                "BNB",
                "POL",
                "GRAM",
                "DAI",
                "USD1",
                "SOL",
                "AVAX",
                "NEAR",
                "APT",
                "SUI",
                "XPL",
                "ARB",
                "XAUT"
              ]
            },
            "network": {
              "type": "string"
            },
            "stage": {
              "type": "string",
              "enum": [
                "Confirming",
                "Reorged",
                "Confirmed"
              ],
              "default": "Confirmed"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "payment_channel_id",
            "amount",
            "currency",
            "network"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_simulate_withdrawal_completion",
    "description": "Simulate completion of a Sandbox withdrawal.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "withdrawal_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "withdrawal_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_start_dashboard_conversation",
    "description": "Start or resume your merchant support conversation and send the supplied message.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "text": {
              "type": "string"
            },
            "locale": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "text",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_unblock_payment_channel",
    "description": "Unblock a payment channel.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "payment_channel_id": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "payment_channel_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_unlink_external_login",
    "description": "Unlink one existing login provider under the current account's native security policy.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "provider": {
              "type": "string"
            },
            "provider_key": {
              "type": "string"
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "provider",
            "provider_key"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_update_membership_permissions",
    "description": "Set the role and extra permissions of a managed team member.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "membership_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "role": {
              "type": "string",
              "enum": [
                "Owner",
                "Admin",
                "Finance",
                "Developer",
                "Custom"
              ]
            },
            "extra_permissions": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string",
                "enum": [
                  "ManageTeam",
                  "ChangeMembershipRole",
                  "ViewTeam",
                  "ViewBalance",
                  "Withdraw",
                  "ViewWithdrawals",
                  "ManageWhitelist",
                  "ViewPayments",
                  "CreatePayments",
                  "RotateSecrets",
                  "ManageProfile",
                  "ViewProfile",
                  "ViewProjects",
                  "ManageProjects",
                  "ViewPartnership",
                  "ViewIntegrations",
                  "ManageIntegrations",
                  "ManageSupport",
                  "BasicAccess"
                ]
              },
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "membership_id",
            "operation_id",
            "role"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_update_merchant_profile",
    "description": "Update the business profile. Changing the business email follows the existing factor policy.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "name": {
              "type": "string"
            },
            "email": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "country": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "name"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_update_my_profile",
    "description": "Update your display name or attach a completed avatar upload. The current avatar can also be removed explicitly.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "display_name": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "avatar_upload_operation_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "remove_avatar": {
              "type": "boolean",
              "default": false
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_update_project",
    "description": "Update an owned project. Attach a completed logo upload or remove the current logo explicitly.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "project_id": {
              "type": "string"
            },
            "form": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "string"
                },
                "kind": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "Invoices",
                    "ClientWallets",
                    null
                  ]
                },
                "website_url": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "success_url": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "fail_url": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "customer_fee_percent": {
                  "type": "integer"
                },
                "underpayment_policy": {
                  "type": "object",
                  "properties": {
                    "tolerance_percent": {
                      "type": "number"
                    }
                  },
                  "required": [
                    "tolerance_percent"
                  ],
                  "additionalProperties": false
                },
                "max_concurrent_deposits_per_client": {
                  "type": [
                    "integer",
                    "null"
                  ]
                },
                "default_currency": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "USD",
                    "EUR",
                    "GBP",
                    "CHF",
                    "CAD",
                    "AUD",
                    "NZD",
                    "JPY",
                    "PLN",
                    "CZK",
                    "DKK",
                    "SEK",
                    "NOK",
                    "HUF",
                    "RUB",
                    "UAH",
                    "GEL",
                    "CNY",
                    "HKD",
                    "KRW",
                    "INR",
                    "IDR",
                    "MYR",
                    "PHP",
                    "THB",
                    "VND",
                    "PKR",
                    "SGD",
                    "BRL",
                    "MXN",
                    "ARS",
                    "CLP",
                    "TRY",
                    "AED",
                    "ILS",
                    "NGN",
                    "ZAR",
                    "BDT",
                    "BHD",
                    "BMD",
                    "KWD",
                    "LKR",
                    "MMK",
                    "SAR",
                    "TWD",
                    null
                  ]
                },
                "enabled_symbols": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "enum": [
                      "USDT",
                      "USDC",
                      "ETH",
                      "TRX",
                      "BNB",
                      "POL",
                      "GRAM",
                      "DAI",
                      "USD1",
                      "SOL",
                      "AVAX",
                      "NEAR",
                      "APT",
                      "SUI",
                      "XPL",
                      "ARB",
                      "XAUT"
                    ]
                  }
                },
                "integration_language": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "cms_plugin_slug": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "checkout_channel": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "Api",
                    "TelegramBot",
                    "Cms",
                    "Terminal",
                    "LowCode",
                    "HostToHost",
                    null
                  ]
                }
              },
              "additionalProperties": false
            },
            "logo_upload_operation_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "remove_logo": {
              "type": "boolean",
              "default": false
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "project_id",
            "form"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_update_project_widget",
    "description": "Update checkout appearance. Omit form_type to preserve the saved layout.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "project_id": {
              "type": "string"
            },
            "appearance": {
              "type": "object",
              "properties": {
                "style": {
                  "type": "string"
                },
                "accent_color": {
                  "type": "string"
                },
                "background_color": {
                  "type": "string"
                },
                "surface_color": {
                  "type": "string"
                },
                "text_color": {
                  "type": "string"
                },
                "muted_color": {
                  "type": "string"
                },
                "radius": {
                  "type": "integer"
                },
                "form_type": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "default": null
                },
                "allowed_origin": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "default": null
                }
              },
              "required": [
                "style",
                "accent_color",
                "background_color",
                "surface_color",
                "text_color",
                "muted_color",
                "radius"
              ],
              "additionalProperties": false
            },
            "is_active": {
              "type": "boolean",
              "default": true
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "project_id",
            "appearance"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_update_webhook",
    "description": "Update a webhook's validated URL, subscriptions and project filter.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "endpoint_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "enabled_categories": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "Invoice",
                  "Withdrawal",
                  "PaymentChannel"
                ]
              }
            },
            "url": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "selected_project_ids": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "endpoint_id",
            "operation_id",
            "enabled_categories"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_upload_project_logo",
    "description": "Prepare a project logo upload, or finalize the same staged file ticket.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "delivery": {
              "type": "object",
              "properties": {
                "request_id": {
                  "type": "string"
                },
                "challenge": {
                  "type": "string"
                }
              },
              "required": [
                "request_id",
                "challenge"
              ],
              "additionalProperties": false
            },
            "content_type": {
              "type": "string"
            },
            "byte_length": {
              "type": "integer"
            },
            "content_sha256": {
              "type": "string"
            },
            "file_ticket": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "project_id",
            "operation_id",
            "delivery",
            "content_type",
            "byte_length",
            "content_sha256"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_upload_user_avatar",
    "description": "Prepare an avatar upload for the signed-in user, or finalize the same staged file ticket.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "delivery": {
              "type": "object",
              "properties": {
                "request_id": {
                  "type": "string"
                },
                "challenge": {
                  "type": "string"
                }
              },
              "required": [
                "request_id",
                "challenge"
              ],
              "additionalProperties": false
            },
            "content_type": {
              "type": "string"
            },
            "byte_length": {
              "type": "integer"
            },
            "content_sha256": {
              "type": "string"
            },
            "file_ticket": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "operation_id",
            "delivery",
            "content_type",
            "byte_length",
            "content_sha256"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "merchant_watch_conversation",
    "description": "Wait for recent support conversation events. Refresh message history after each watch using the backward cursor query.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "conversation_id": {
              "type": "string"
            },
            "wait_ms": {
              "type": "integer",
              "default": 20000
            },
            "max_events": {
              "type": "integer",
              "default": 50
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid",
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ],
              "default": null
            }
          },
          "required": [
            "conversation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_block_payment_channel",
    "description": "Sandbox API POST /v1/payment-channels/:payment_channel_id/block",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "payment_channel_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "payment_channel_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_cancel_invoice",
    "description": "Sandbox API POST /v1/invoices/:invoice_id/cancel",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": "string"
            },
            "reason": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "invoice_id",
            "reason",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_cancel_withdrawal",
    "description": "Sandbox API POST /v1/withdrawals/:withdrawal_id/cancel",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "withdrawal_id": {
              "type": "string"
            },
            "reason": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "withdrawal_id",
            "reason",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_confirm_invoice_payment",
    "description": "Sandbox API POST /v1/invoices/:invoice_id/confirm-payment",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": "string"
            },
            "currency": {
              "type": "string"
            },
            "network": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "invoice_id",
            "currency",
            "network",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_create_invoice",
    "description": "Sandbox API POST /v1/invoices",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "amount": {
              "type": "string"
            },
            "currency": {
              "type": "string"
            },
            "external_order_id": {
              "type": "string"
            },
            "network": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "customer_fee_percent": {
              "type": [
                "integer",
                "null"
              ],
              "default": null
            },
            "client_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "products": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "object",
                "properties": {
                  "title": {
                    "type": "string"
                  },
                  "quantity": {
                    "type": "integer"
                  },
                  "unit_amount": {
                    "type": "string"
                  },
                  "description": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "default": null
                  }
                },
                "required": [
                  "title",
                  "quantity",
                  "unit_amount"
                ],
                "additionalProperties": false
              },
              "default": null
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "project_id",
            "amount",
            "currency",
            "external_order_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_create_payment_channel",
    "description": "Sandbox API POST /v1/payment-channels",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "project_id": {
              "type": "string"
            },
            "external_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "project_id",
            "external_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_create_refund",
    "description": "Sandbox API POST /v1/refunds",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": "string"
            },
            "mode": {
              "type": "string"
            },
            "external_order_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "invoice_id",
            "mode",
            "external_order_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_create_withdrawal",
    "description": "Sandbox API POST /v1/withdrawals",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "destination_address": {
              "type": "string"
            },
            "network": {
              "type": "string"
            },
            "currency": {
              "type": "string"
            },
            "amount": {
              "type": "string"
            },
            "external_order_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "destination_address",
            "network",
            "currency",
            "amount",
            "external_order_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_get_balances",
    "description": "Sandbox API GET /v1/balances",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_get_invoice",
    "description": "Sandbox API GET /v1/invoices/:invoice_id",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": "string"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "invoice_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_get_payment_channel",
    "description": "Sandbox API GET /v1/payment-channels/:payment_channel_id",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "payment_channel_id": {
              "type": "string"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "payment_channel_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_get_payment_channel_deposit",
    "description": "Sandbox API GET /v1/payment-channel-deposits/:payment_channel_deposit_id",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "payment_channel_deposit_id": {
              "type": "string"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "payment_channel_deposit_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_get_refund",
    "description": "Sandbox API GET /v1/refunds/:withdrawal_id",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "withdrawal_id": {
              "type": "string"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "withdrawal_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_get_time",
    "description": "Sandbox API GET /v1/time",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_get_withdrawal",
    "description": "Sandbox API GET /v1/withdrawals/:withdrawal_id",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "withdrawal_id": {
              "type": "string"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "withdrawal_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_list_invoices",
    "description": "Sandbox API GET /v1/invoices",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "limit": {
              "type": "integer",
              "default": 20
            },
            "cursor": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "status": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "external_order_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "created_from": {
              "type": [
                "integer",
                "null"
              ],
              "default": null
            },
            "created_to": {
              "type": [
                "integer",
                "null"
              ],
              "default": null
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_list_payment_channel_deposits",
    "description": "Sandbox API GET /v1/payment-channel-deposits",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "limit": {
              "type": "integer",
              "default": 20
            },
            "cursor": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "payment_channel_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "confirmed_from": {
              "type": [
                "integer",
                "null"
              ],
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_list_payment_channels",
    "description": "Sandbox API GET /v1/payment-channels",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "limit": {
              "type": "integer",
              "default": 20
            },
            "cursor": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "status": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "external_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "project_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_list_refunds",
    "description": "Sandbox API GET /v1/refunds",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "limit": {
              "type": "integer",
              "default": 20
            },
            "cursor": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "status": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "invoice_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "created_from": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "created_to": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_list_withdrawals",
    "description": "Sandbox API GET /v1/withdrawals",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "limit": {
              "type": "integer",
              "default": 20
            },
            "cursor": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "status": {
              "type": [
                "array",
                "null"
              ],
              "items": {
                "type": "string"
              },
              "default": null
            },
            "external_order_id": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "created_from": {
              "type": [
                "integer",
                "null"
              ],
              "default": null
            },
            "created_to": {
              "type": [
                "integer",
                "null"
              ],
              "default": null
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_simulate_invoice_payment",
    "description": "Sandbox API POST /v1/sandbox/invoices/:invoice_id/simulate-payment",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "invoice_id": {
              "type": "string"
            },
            "stage": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "invoice_id",
            "stage",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_simulate_payment_channel_deposit",
    "description": "Sandbox API POST /v1/sandbox/payment-channels/:payment_channel_id/simulate-deposit",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "payment_channel_id": {
              "type": "string"
            },
            "amount": {
              "type": "string"
            },
            "currency": {
              "type": "string"
            },
            "network": {
              "type": "string"
            },
            "stage": {
              "type": [
                "string",
                "null"
              ],
              "default": null
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "payment_channel_id",
            "amount",
            "currency",
            "network",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_simulate_refund",
    "description": "Sandbox API POST /v1/sandbox/refunds/:withdrawal_id/simulate",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "withdrawal_id": {
              "type": "string"
            },
            "status": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "withdrawal_id",
            "status",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_simulate_withdrawal_completion",
    "description": "Sandbox API POST /v1/sandbox/withdrawals/:withdrawal_id/simulate-completion",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "withdrawal_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "withdrawal_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  },
  {
    "name": "playground_unblock_payment_channel",
    "description": "Sandbox API POST /v1/payment-channels/:payment_channel_id/unblock",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "payment_channel_id": {
              "type": "string"
            },
            "operation_id": {
              "type": "string",
              "format": "uuid"
            },
            "environment": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "Production",
                "Sandbox",
                null
              ]
            },
            "merchant_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          },
          "required": [
            "payment_channel_id",
            "operation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "input"
      ]
    }
  }
];
