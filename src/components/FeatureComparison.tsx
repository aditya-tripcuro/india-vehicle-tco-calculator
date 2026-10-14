import { VEHICLE_COLORS } from './VehiclePanel';

/**
 * Static, indicative feature/spec reference for the three preloaded vehicles.
 * This is reference information for shopping comparison — it does not feed the
 * TCO calculation. Sources: NEXA / Hyundai India official pages, CarWale,
 * CarDekho, Autocar India and Bharat NCAP (as of October 2026).
 */

interface FeatureRow {
  feature: string;
  brezza: string;
  venue: string;
  evitara: string;
}

const ROWS: FeatureRow[] = [
  { feature: 'Powertrain', brezza: 'Petrol (mild hybrid)', venue: 'Petrol (turbo)', evitara: 'Electric' },
  {
    feature: 'Engine / motor',
    brezza: '1.5L K15C DualJet, 4-cyl + smart hybrid',
    venue: '1.0L Kappa Turbo GDi, 3-cyl',
    evitara: 'Electric motor, 49 kWh LFP battery',
  },
  { feature: 'Power', brezza: '~103 PS @ 6,000 rpm', venue: '120 PS @ 6,000 rpm', evitara: '144 PS' },
  { feature: 'Torque', brezza: '~139 Nm @ 4,400 rpm', venue: '172 Nm @ 1,500–4,000 rpm', evitara: '~190 Nm' },
  { feature: 'Transmission', brezza: '6-speed torque-converter AT', venue: '7-speed DCT', evitara: 'Single-speed' },
  { feature: 'Drive', brezza: 'FWD', venue: 'FWD', evitara: 'FWD (2WD)' },
  {
    feature: 'Energy & storage',
    brezza: 'Petrol, ~48 L tank',
    venue: 'Petrol, ~45 L tank',
    evitara: 'Grid electricity, 49 kWh battery',
  },
  {
    feature: 'Claimed efficiency / range (indicative)',
    brezza: '~19.8 km/l',
    venue: '~18–20 km/l',
    evitara: '440 km (ARAI, 49 kWh)',
  },
  { feature: 'Refuel / recharge', brezza: '5 min at a fuel station', venue: '5 min at a fuel station', evitara: '10–80% DC fast charge in ~45 min' },
  { feature: 'Length', brezza: '4,345 mm', venue: '~4.0 m (2nd gen)', evitara: '4,275 mm' },
  { feature: 'Wheelbase', brezza: '2,520 mm', venue: '2,570 mm', evitara: '2,700 mm' },
  { feature: 'Sunroof', brezza: 'Electric sunroof', venue: 'Voice-enabled smart electric sunroof', evitara: 'Higher variants only' },
  { feature: 'Infotainment', brezza: '9-inch SmartPlay Pro+', venue: 'Dual 12.3-inch curved panoramic displays', evitara: '10.1-inch SmartPlay Pro' },
  { feature: 'ADAS', brezza: 'Not offered', venue: 'Level 2 (16 features)', evitara: 'Level 2 (15+ features)' },
  { feature: '360° camera', brezza: 'No (ZXi+ and above)', venue: 'Yes', evitara: 'Yes' },
  { feature: 'Ventilated front seats', brezza: 'No', venue: 'Yes', evitara: 'Higher variants' },
  { feature: 'Rear seat', brezza: '60:40 split', venue: 'Split with sunshade', evitara: 'Sliding & reclining' },
  { feature: 'Airbags', brezza: '6', venue: '6', evitara: '7' },
  {
    feature: 'Published crash rating',
    brezza: '4★ Global NCAP (2022); 2026 facelift: 5★ Bharat NCAP',
    venue: 'Awaiting Bharat NCAP',
    evitara: 'Awaiting Bharat NCAP',
  },
  {
    feature: 'Audio & connected tech',
    brezza: 'Suzuki Connect, cruise control',
    venue: 'Bose 8-speaker + subwoofer, Bluelink 65+ features, rear sunshade',
    evitara: 'Suzuki Connect, cruise control',
  },
  {
    feature: 'Standard warranty',
    brezza: '2 yr / 40,000 km (extendable)',
    venue: '3 yr / unlimited km (extendable)',
    evitara: '8 yr / 1.6 lakh km battery warranty',
  },
];

export function FeatureComparison() {
  return (
    <div>
      <div className="scroll-x">
        <table className="data feature-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th className="group" style={{ '--group-color': VEHICLE_COLORS[0] } as React.CSSProperties}>Maruti Suzuki Brezza ZXi AT</th>
              <th className="group" style={{ '--group-color': VEHICLE_COLORS[1] } as React.CSSProperties}>Hyundai Venue HX6 DCT Turbo</th>
              <th className="group" style={{ '--group-color': VEHICLE_COLORS[2] } as React.CSSProperties}>Maruti Suzuki e Vitara Delta</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.feature}>
                <td>{row.feature}</td>
                <td>{row.brezza}</td>
                <td>{row.venue}</td>
                <td>{row.evitara}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="inline-note" style={{ marginTop: 8 }}>
        Indicative manufacturer-claimed specifications gathered in October 2026 from NEXA and
        Hyundai India official pages, CarWale / CarDekho / Autocar India and Bharat NCAP. Variant
        equipment and figures change with model years — verify with the dealer before purchase.
        This table is reference information only; it does not feed the TCO calculation. The
        mileage, efficiency and range figures used in the calculator are the editable planning
        assumptions in each vehicle panel.
      </p>
    </div>
  );
}
