-- Reference data: subscription plans. Price abhi 0 hai, admin Plans page se set karega.
-- order_limit 0 = koi limit nahi (Free Trial).

INSERT INTO plans (id, name, tier, months, days, price, order_limit, is_active) VALUES
  ('trial',       'Free Trial',       NULL,      0,  14, 0, 0,  1),

  ('silver-1m',   'Silver 1 Month',   'Silver',  1,  0,  0, 20, 1),
  ('silver-3m',   'Silver 3 Months',  'Silver',  3,  0,  0, 20, 1),
  ('silver-6m',   'Silver 6 Months',  'Silver',  6,  0,  0, 20, 1),
  ('silver-12m',  'Silver 1 Year',    'Silver',  12, 0,  0, 20, 1),

  ('golden-1m',   'Golden 1 Month',   'Golden',  1,  0,  0, 40, 1),
  ('golden-3m',   'Golden 3 Months',  'Golden',  3,  0,  0, 40, 1),
  ('golden-6m',   'Golden 6 Months',  'Golden',  6,  0,  0, 40, 1),
  ('golden-12m',  'Golden 1 Year',    'Golden',  12, 0,  0, 40, 1),

  ('diamond-1m',  'Diamond 1 Month',  'Diamond', 1,  0,  0, 60, 1),
  ('diamond-3m',  'Diamond 3 Months', 'Diamond', 3,  0,  0, 60, 1),
  ('diamond-6m',  'Diamond 6 Months', 'Diamond', 6,  0,  0, 60, 1),
  ('diamond-12m', 'Diamond 1 Year',   'Diamond', 12, 0,  0, 60, 1);