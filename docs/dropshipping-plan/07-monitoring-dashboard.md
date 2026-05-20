# Monitoring Dashboard Spec & Post-Launch Playbook

---

## Part 1: Monitoring Dashboard Specification

### KPI Categories

#### A. Revenue & Sales Metrics
| KPI | Formula | Target | Alert (Yellow) | Alert (Red) |
|---|---|---|---|---|
| Daily Revenue | Sum of order values | $180+/day (likely) | < $100/day | < $50/day |
| Weekly Revenue | Sum of 7-day revenue | $1,260+ | < $700 | < $350 |
| Monthly Revenue | Sum of 30-day revenue | $5,400+ | < $3,000 | < $1,500 |
| Orders per Day | Count of completed orders | 4+ | < 2 | 0 |
| Average Order Value (AOV) | Revenue ÷ Orders | $54.99 | < $50 | < $45 |
| Refund Rate | Refunds ÷ Orders | < 3% | 3–6% | > 6% |

#### B. Marketing & Acquisition Metrics
| KPI | Formula | Target | Alert (Yellow) | Alert (Red) |
|---|---|---|---|---|
| Blended CPA | Total ad spend ÷ Total orders | ≤ $15 | $15–$20 | > $20 |
| Blended ROAS | Revenue ÷ Ad spend | ≥ 3.0× | 2.0–3.0× | < 2.0× |
| TikTok CPA | TikTok spend ÷ TikTok conversions | ≤ $12 | $12–$18 | > $18 |
| Meta CPA | Meta spend ÷ Meta conversions | ≤ $15 | $15–$22 | > $22 |
| CTR (all channels) | Clicks ÷ Impressions | ≥ 1.4% | 1.0–1.4% | < 1.0% |
| Ad Frequency | Avg impressions per user | < 3.0 | 3.0–5.0 | > 5.0 |
| Email Revenue % | Email revenue ÷ Total revenue | ≥ 15% | 10–15% | < 10% |

#### C. Conversion Funnel Metrics
| KPI | Formula | Target | Alert (Yellow) | Alert (Red) |
|---|---|---|---|---|
| Site Sessions | GA4 sessions | 200+/day | < 100 | < 50 |
| Product Page View Rate | PDP views ÷ Sessions | ≥ 60% | 40–60% | < 40% |
| Add to Cart Rate | ATCs ÷ PDP views | ≥ 8% | 5–8% | < 5% |
| Cart to Checkout Rate | Checkouts ÷ ATCs | ≥ 50% | 35–50% | < 35% |
| Checkout Completion Rate | Orders ÷ Checkouts | ≥ 60% | 45–60% | < 45% |
| Overall Conversion Rate | Orders ÷ Sessions | ≥ 1.5% | 1.0–1.5% | < 1.0% |

#### D. Fulfillment & Operations Metrics
| KPI | Formula | Target | Alert (Yellow) | Alert (Red) |
|---|---|---|---|---|
| Processing Time | Order placed → Shipped | ≤ 2 days | 2–4 days | > 4 days |
| Delivery Time | Shipped → Delivered | ≤ 7 days | 7–10 days | > 10 days |
| Supplier Fill Rate | Orders fulfilled ÷ Orders placed | ≥ 97% | 93–97% | < 93% |
| Return Rate | Returns ÷ Delivered orders | < 3% | 3–6% | > 6% |
| Chargeback Rate | Chargebacks ÷ Transactions | < 0.5% | 0.5–1.0% | > 1.0% |
| Support Tickets/Day | Daily ticket count | < 5 | 5–10 | > 10 |

#### E. Financial Health Metrics
| KPI | Formula | Target | Alert (Yellow) | Alert (Red) |
|---|---|---|---|---|
| Gross Margin | (Revenue - COGS) ÷ Revenue | ≥ 63% | 50–63% | < 50% |
| Net Margin | Net profit ÷ Revenue | ≥ 30% | 20–30% | < 20% |
| Cash on Hand | Bank balance | > $500 | $200–$500 | < $200 |
| Daily Burn Rate | Daily total expenses | < $80 | $80–$120 | > $120 |
| CAC:LTV Ratio | Customer LTV ÷ CAC | ≥ 3:1 | 2:1–3:1 | < 2:1 |

---

### Reporting Cadence

| Report | Frequency | Contents | Owner |
|---|---|---|---|
| Daily Snapshot | Every day, 9 PM | Revenue, orders, CPA, ROAS, ad spend, issues | Operator |
| Weekly Summary | Every Monday | Full KPI review, trend analysis, action items | Operator |
| Bi-Weekly P&L | Every 2 weeks | Revenue, COGS, ad spend, fees, net profit | Operator |
| Monthly Review | 1st of month | Full business review, forecast update, strategy adjustments | Operator |
| Ad-Hoc Alert | On trigger | Immediate notification when red alert threshold hit | Automated |

### Dashboard Tools

| Tool | Purpose | Cost |
|---|---|---|
| Shopify Analytics | Sales, orders, conversion funnel | Included |
| Google Analytics 4 | Traffic, behavior, attribution | Free |
| TikTok Ads Manager | TikTok campaign performance | Free |
| Meta Ads Manager | Facebook/Instagram campaign performance | Free |
| Klaviyo Dashboard | Email performance, flows, revenue attribution | Free tier |
| Google Sheets Tracker | Custom P&L, daily KPI log, experiment tracker | Free |

### Automated Alerts (Set Up in Shopify + Ad Platforms)

1. **Revenue drops > 50% vs. 7-day average** → Email notification
2. **CPA exceeds $20 on any ad set** → Auto-pause ad set (Meta rules)
3. **Ad account flagged/limited** → Email + SMS notification
4. **Inventory < 20 units at supplier** → Email alert from CJ Dropshipping
5. **Chargeback received** → Shopify notification → immediate investigation
6. **1-star review posted** → Judge.me/Loox notification → respond within 4 hours

---

## Part 2: Post-Launch Playbook

### Prioritized Experiments (Ranked by Expected Value Uplift)

| Priority | Experiment | Metric to Improve | Expected Uplift | Cost | Timeline |
|---|---|---|---|---|---|
| 1 | A/B test product page headline | Conversion rate | +15–25% | $0 | Week 2 |
| 2 | A/B test price ($54.99 vs $59.99) | Revenue per visitor | +5–10% | $0 | Week 2 |
| 3 | Add video to product page (auto-play) | ATC rate | +10–20% | $0 | Week 2 |
| 4 | Test 3 new ad creatives (UGC style) | CTR + CPA | +20–30% | $50 | Week 3 |
| 5 | Add post-purchase upsell (serum) | AOV | +15–25% | $19/mo app | Week 3 |
| 6 | Launch Google Shopping campaign | New customer acquisition | +15% revenue | $150 | Week 3 |
| 7 | A/B test checkout — 1 page vs multi-step | Checkout completion | +5–10% | $0 | Week 4 |
| 8 | Bundle offer (mask + serum, $69.99) | AOV + margin | +10–15% AOV | $20 in samples | Week 4 |
| 9 | Referral program (give $10, get $10) | Organic acquisition | +5–10% orders | $10/referral | Month 2 |
| 10 | SMS marketing (abandoned cart) | Recovery rate | +5–8% revenue | $20/mo | Month 2 |

### Experiment Protocol
1. **Hypothesis:** State what you expect and why
2. **Metric:** Primary KPI to measure
3. **Sample size:** Minimum 100 visitors per variant (or 50 orders)
4. **Duration:** 7–14 days minimum
5. **Decision:** Statistically significant at 90% confidence → implement winner
6. **Log:** Record result, learnings, and updated priors

---

### Retention Flows

#### Email Retention Sequence
| Trigger | Timing | Email | Goal |
|---|---|---|---|
| First purchase | +7 days | "How to get the most from your GlowPro" | Reduce returns, build loyalty |
| First purchase | +14 days | "Share your GlowPro results ⭐" | Generate reviews + UGC |
| First purchase | +30 days | "Upgrade your routine — 15% off serums" | Cross-sell, increase LTV |
| First purchase | +60 days | "GlowPro tip: Try this new LED routine" | Re-engage, prevent churn |
| First purchase | +90 days | "Gift a GlowPro to someone you love 🎁" | Referral + new acquisition |
| Cart abandoned | +1 hour | "You left your glow behind ✨" | Recover 10–15% of abandoned carts |
| Browse abandoned | +4 hours | "Still curious about LED therapy?" | Nurture high-intent visitors |

#### Loyalty Program (Month 3+)
- Points per purchase (1 point per $1 spent)
- Referral bonus (200 points = $10 off)
- VIP tiers: Bronze (1 order) → Silver (3 orders) → Gold (5+ orders)
- Gold perks: Free shipping, early access to new products, 20% off

---

### Margin Improvement Tactics

| Tactic | Expected Savings | Timeline | Effort |
|---|---|---|---|
| Negotiate supplier price to $14/unit | $1–$2/unit | Month 2 | Low |
| Switch to Alibaba bulk ordering (200+ units) | $3–$5/unit | Month 3 | Medium |
| Add higher-AOV upsell products | +$10–$15 AOV | Month 2 | Low |
| Reduce ad CPA through creative optimization | $2–$5/sale | Ongoing | Medium |
| Email marketing drives 20%+ of revenue (zero CAC) | Saves $3/sale on those orders | Month 2 | Low |
| Negotiate Shopify Payments rate (at volume) | 0.1–0.3% savings | Month 4+ | Low |
| Custom packaging from Alibaba | $0.30/unit branding cost vs $0 (worth it for LTV) | Month 3 | Medium |

---

### Scale vs. Kill Decision Framework

#### When to SCALE (increase budget 2× per week)
- CPA consistently < $12 for 7+ days
- ROAS > 3.5× blended
- Net margin > 30% after all costs
- Return rate < 4%
- Supplier can handle 2× volume
- Cash flow positive (reinvesting profits)

**Scaling playbook:**
1. Increase daily ad budget by 20% every 3 days (not more — avoids learning phase reset)
2. Expand to new audiences (lookalikes, new interest groups)
3. Launch on new channels (Google Shopping, Pinterest, YouTube Shorts)
4. Begin Alibaba bulk ordering for better margins
5. Hire a VA for customer support ($5–$8/hr, 2 hrs/day)

#### When to KILL (stop and pivot)
- CPA > $25 for 7+ consecutive days despite 3+ creative refreshes
- Net margin < 10% after optimization attempts
- Return rate > 10% (quality problem)
- Supplier lead time > 14 days consistently
- Total losses exceed $500 with no improvement trend
- Projected payback > 90 days

**Kill playbook:**
1. Pause all ads immediately
2. Fulfill remaining orders
3. Document learnings (what worked, what didn't)
4. Update product selection priors
5. Begin validation plan for Product #2 (Pet Self-Cleaning Brush)
6. Reuse store infrastructure — just swap product/creative

#### When to PIVOT (modify approach, same product)
- CPA $15–$25 with improving trend
- Conversion rate > 1% but < 1.5%
- Good engagement metrics but low purchase rate

**Pivot options:**
1. Test lower price point ($44.99)
2. Test different positioning (acne-focused vs. anti-aging)
3. Test different target demo (men's skincare)
4. Bundle with complementary product to increase perceived value
5. Switch from paid ads to influencer-only strategy for 14 days
