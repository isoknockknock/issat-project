import pandas as pd
import matplotlib.pyplot as plt
import ast  # Used to safely parse the 'groups' string from GEE
import os

# --- SETTINGS (5 CATEGORIES) ---
# Aligned with your GEE: 0:Water, 1:Vegetation, 2:Cropland, 3:Built-up, 4:Barren
CLASS_MAP = {
    0: "Water", 1: "Vegetation", 2: "Cropland", 3: "Built-up", 4: "Barren"
}

def create_styled_table(df, title, filename, header_color='#2c3e50'):
    """Renders a DataFrame as a clean, high-res PNG table."""
    fig, ax = plt.subplots(figsize=(12, len(df) * 0.5 + 2))
    ax.axis('off')
    
    tbl = ax.table(cellText=df.values, colLabels=df.columns, loc='center', cellLoc='center')
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(10)
    tbl.scale(1.2, 1.8) # Original scaling
    
    for (row, col), cell in tbl.get_celld().items():
        if row == 0:
            cell.set_text_props(weight='bold', color='white')
            cell.set_facecolor(header_color)
        elif row % 2 == 0:
            cell.set_facecolor('#f9f9f9')

    plt.title(title, fontsize=16, pad=20, weight='bold')
    plt.savefig(filename, bbox_inches='tight', dpi=300)
    plt.close()

def parse_gee_groups(df):
    """
    GEE exports 'groups' as a string: [{transition=12, sum=5.5}, ...].
    This function flattens that into actual columns like 'trans_12'.
    """
    new_rows = []
    for _, row in df.iterrows():
        row_dict = row.to_dict()
        groups_str = str(row.get('groups', '[]'))
        
        # Convert GEE key=value format to Python dict format {"key": value}
        clean_str = groups_str.replace('=', ':').replace('transition', '"transition"').replace('sum', '"sum"')
        
        try:
            # Convert string representation of list to actual Python list
            groups_list = ast.literal_eval(clean_str)
            for item in groups_list:
                # Create a column for every transition found (e.g., trans_13)
                col_name = f"trans_{item['transition']}"
                row_dict[col_name] = item['sum']
        except Exception as e:
            # If parsing fails, the row remains as is
            pass
        new_rows.append(row_dict)
    
    return pd.DataFrame(new_rows).fillna(0)

def perform_full_district_analysis(state_prefix):
    print(f"Generating full district reports for {state_prefix}...")

    # 1. LOAD AND PARSE DATA
    try:
        # Load the raw CSVs and immediately flatten the 'groups' column
        df_16_20 = parse_gee_groups(pd.read_csv(f"{state_prefix}_Transition_2016_2020.csv"))
        df_20_25 = parse_gee_groups(pd.read_csv(f"{state_prefix}_Transition_2020_2025.csv"))
        df_long  = parse_gee_groups(pd.read_csv(f"{state_prefix}_Transition_2016_2025.csv"))
    except Exception as e:
        print(f"Error loading/parsing files for {state_prefix}: {e}")
        return

    # 2. IDENTIFY CHANGE COLUMNS
    # Identify all columns that represent a transition (excluding persistence: 0, 11, 22, 33, 44)
    all_cols = [c for c in df_long.columns if c.startswith('trans_')]
    persistence_codes = [0, 11, 22, 33, 44]
    
    change_cols = []
    for c in all_cols:
        try:
            code = int(c.split('_')[1])
            if code not in persistence_codes:
                change_cols.append(c)
        except:
            continue

    all_district_data = []

    for _, row in df_long.iterrows():
        dist_name = row['ADM2_NAME']
        
        # Get matching rows for sub-periods
        r16_20 = df_16_20[df_16_20['ADM2_NAME'] == dist_name]
        r20_25 = df_20_25[df_20_25['ADM2_NAME'] == dist_name]
        
        if r16_20.empty or r20_25.empty:
            continue

        # 3. CALCULATE RATES (Sum of areas in change_cols)
        # Ensure we only sum columns that actually exist in the sub-period data
        c1 = [c for c in change_cols if c in r16_20.columns]
        c2 = [c for c in change_cols if c in r20_25.columns]
        
        rate1 = r16_20[c1].sum(axis=1).values[0] / 4.0
        rate2 = r20_25[c2].sum(axis=1).values[0] / 5.0
        
        # 4. NATURE OF CHANGE
        avg_rate = (rate1 + rate2) / 2
        diff = abs(rate1 - rate2)
        
        if avg_rate < 0.0001:
            status = "STABLE"
        else:
            # 0.25 Threshold from your original script
            status = "GRADUAL" if diff < (avg_rate * 0.25) else "ABRUPT"
        
        # 5. DECODE DOMINANT TRANSITION
        dist_long_changes = row[[c for c in change_cols if c in row.index]]
        
        if not dist_long_changes.empty and dist_long_changes.max() > 0:
            dom_col = dist_long_changes.idxmax()
            code = int(dom_col.split('_')[1])
            
            # GEE Logic: code = (from * 10) + to
            f_class = code // 10
            t_class = code % 10
            dom_text = f"{CLASS_MAP.get(f_class, 'NA')}→{CLASS_MAP.get(t_class, 'NA')}"
        else:
            dom_text = "Stable/No Change"

        all_district_data.append({
            'District': dist_name,
            'Major Transition': dom_text,
            'Rate 16-20 (km²/yr)': f"{rate1:.4f}", # Using 4 decimals to ensure small data is visible
            'Rate 20-25 (km²/yr)': f"{rate2:.4f}",
            'Nature of Change': status
        })

    # Create Summary DataFrame and Export Table
    full_df = pd.DataFrame(all_district_data).sort_values('Rate 20-25 (km²/yr)', ascending=False)
    
    output_filename = f"{state_prefix}_Full_District_Analysis.png"
    create_styled_table(
        full_df, 
        f"{state_prefix.upper()}: District Temporal Analysis (2016-2025)", 
        output_filename
    )
    print(f"Successfully generated: {output_filename}")

# --- EXECUTION ---
if __name__ == "__main__":
    for state in ['Punjab', 'UK']:
        perform_full_district_analysis(state)
    print("\nAll reports complete.")