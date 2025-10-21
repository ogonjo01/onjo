// netlify/functions/enhance.js
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let { description, steps } = JSON.parse(event.body);

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    'You are a globally recognized investment strategist and content expert. Enhance the following description and steps into a professional investment strategy for categories like book summaries, courses, quizzes, or business ideas. Return a JSON object with: investment_synopsis ({what_is_it, who_offers_it, goal, fit_check}), returns_projections ({expected_returns, guaranteed, time_horizon, examples_check}), risk_assessment ({potential_issues, capital_risk, risk_types, legal_risks, affordability_check}), historical_performance ({past_performance, verifiable_data, downturn_performance, disclaimer_check}), liquidity_profile ({ease_of_withdrawal, lock_in_period, penalties, exit_check}), cost_structure ({management_fees, hidden_costs, impact_check}), management_team ({key_personnel, track_record, credentials, conflicts, trust_check}), legal_compliance ({regulatory_body, documentation, legal_history, scam_check}), operational_mechanics ({return_generation, investment_allocation, contingency_plan, simplicity_check}), personal_alignment ({risk_tolerance, income_needs, tax_strategy, diversification, suitability_check}), exit_strategy ({exit_process, transferability, buyer_availability, plan_check}), key_metrics ({roi, npv, irr, payback_period, cash_flow, analysis_check}), red_flags ({pressure_tactics, clarity_issues, risk_hype, instinct_check}). Ensure content is sophisticated, value-driven, and actionable.',
                },
                { text: `Description: ${description}\nSteps: ${steps}` },
              ],
            },
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
        }),
      }
    );

    const raw = await resp.text();
    if (!resp.ok) {
      console.error('Gemini error:', resp.status, raw);
      throw new Error(`Gemini API ${resp.status}: ${raw}`);
    }

    let enhancedData;
    try {
      enhancedData = JSON.parse(raw);
    } catch {
      enhancedData = {
        investment_synopsis: { what_is_it: description, who_offers_it: '', goal: '', fit_check: '' },
        returns_projections: { expected_returns: '', guaranteed: '', time_horizon: '', examples_check: '' },
        risk_assessment: { potential_issues: [], capital_risk: '', risk_types: [], legal_risks: '', affordability_check: '' },
        historical_performance: { past_performance: '', verifiable_data: '', downturn_performance: '', disclaimer_check: '' },
        liquidity_profile: { ease_of_withdrawal: '', lock_in_period: '', penalties: '', exit_check: '' },
        cost_structure: { management_fees: '', hidden_costs: '', impact_check: '' },
        management_team: { key_personnel: '', track_record: '', credentials: '', conflicts: '', trust_check: '' },
        legal_compliance: { regulatory_body: '', documentation: '', legal_history: '', scam_check: '' },
        operational_mechanics: { return_generation: '', investment_allocation: '', contingency_plan: '', simplicity_check: '' },
        personal_alignment: { risk_tolerance: '', income_needs: '', tax_strategy: '', diversification: '', suitability_check: '' },
        exit_strategy: { exit_process: '', transferability: '', buyer_availability: '', plan_check: '' },
        key_metrics: { roi: '', npv: '', irr: '', payback_period: '', cash_flow: '', analysis_check: '' },
        red_flags: { pressure_tactics: '', clarity_issues: '', risk_hype: '', instinct_check: '' },
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify(enhancedData),
    };
  } catch (err) {
    console.error('Enhance failed:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
}