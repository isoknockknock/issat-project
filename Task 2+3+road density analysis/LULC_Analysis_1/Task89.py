import pandas as pd
import matplotlib.pyplot as plt
import ast
import os
from matplotlib.lines import Line2D

# --- HELPER: PARSE GEE NESTED DATA ---
def parse_gee_results(df, key_name):
    """Parses the 'groups' column string into actual columns."""
    new_rows = []
    for _, row in df.iterrows():
        row_dict = row.to_dict()
        groups_str = str(row.get('groups', '[]'))
        clean_str = groups_str.replace('=', ':').replace(key_name, f'"{key_name}"').replace('sum', '"sum"')
        try:
            groups_list = ast.literal_eval(clean_str)
            for item in groups_list:
                col_name = f"{key_name}_{item[key_name]}"
                row_dict[col_name] = item['sum']
        except Exception:
            pass
        new_rows.append(row_dict)
    return pd.DataFrame(new_rows).fillna(0)

# --- HELPER: STYLED TABLE GENERATOR ---
def save_as_table_png(df, title, filename):
    """Renders a dataframe as a clean PNG table."""
    fig, ax = plt.subplots(figsize=(10, len(df) * 0.5 + 1.5))
    ax.axis('off')
    tbl = ax.table(cellText=df.values, colLabels=df.columns, loc='center', cellLoc='center')
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(9)
    tbl.scale(1.2, 1.8)
    # Style Header
    for (row, col), cell in tbl.get_celld().items():
        if row == 0:
            cell.set_text_props(weight='bold', color='white')
            cell.set_facecolor('#2c3e50')
    plt.title(title, fontsize=14, pad=10, weight='bold')
    plt.savefig(filename, bbox_inches='tight', dpi=300)
    plt.close()

# ============================================================
# TASK 8: Composite Change Intensity Index
# ============================================================
def task8_composite_index(state_prefix):
    print(f"Generating Task 8 for {state_prefix}...")
    try:
        c16 = parse_gee_results(pd.read_csv(f"{state_prefix}_DistrictStats_2016.csv"), 'class')
        c25 = parse_gee_results(pd.read_csv(f"{state_prefix}_DistrictStats_2025.csv"), 'class')
        target = 'class_3'
        
        df = c16[['ADM2_NAME', target]].rename(columns={target: 'b16'})
        df['b25'] = c25[target]
        df['growth'] = (df['b25'] - df['b16']) / 9
        
        # Normalization
        df['score'] = (df['growth'] - df['growth'].min()) / (df['growth'].max() - df['growth'].min())
        df_ranked = df.sort_values('score', ascending=False)

        plt.figure(figsize=(10, 6))
        plt.barh(df_ranked['ADM2_NAME'][::-1], df_ranked['score'][::-1], color='teal')
        plt.title(f'{state_prefix}: Urban Growth Intensity')
        plt.savefig(f"{state_prefix}_Task8_Composite_Index.png")
        plt.close()
    except Exception as e: print(f"Error Task 8: {e}")

# ============================================================
# TASK 9: Noise Validation (Now Outputting PNG Table)
# ============================================================
def task9_noise_validation(state_prefix, noise_threshold_km2=0.5):
    print(f"Generating Task 9 for {state_prefix}...")
    try:
        # 1. Load and Parse
        trans_df = parse_gee_results(pd.read_csv(f"{state_prefix}_Transition_2016_2025.csv"), 'transition')
        stats_df = parse_gee_results(pd.read_csv(f"{state_prefix}_DistrictStats_2025.csv"), 'class')
        
        # Calculate areas
        area_cols = [col for col in stats_df.columns if col.startswith('class_')]
        stats_df['total_area'] = stats_df[area_cols].sum(axis=1)
        area_map = stats_df.set_index('ADM2_NAME')['total_area'].to_dict()

        # Identify transitions (ignore 0, 11, 22, 33, 44)
        t_cols = [c for c in trans_df.columns if c.startswith('transition_')]
        change_cols = [c for c in t_cols if int(c.split('_')[1]) % 11 != 0]

        results = []
        for _, row in trans_df.iterrows():
            dist = row['ADM2_NAME']
            area = area_map.get(dist, 0)
            change = row[change_cols].sum()
            pct = (change / area * 100) if area > 0 else 0
            is_noise = (change < noise_threshold_km2) or (pct < 0.5)

            results.append({
                'District': dist,
                'Change (km2)': round(change, 3),
                'Total Area': round(area, 1),
                '% Changed': f"{pct:.2f}%",
                'Status': 'NOISE' if is_noise else 'VALID'
            })

        results_df = pd.DataFrame(results).sort_values('Change (km2)', ascending=False)

        # --- OUTPUT 1: Visual Table ---
        save_as_table_png(results_df, f"{state_prefix}: LULC Noise Validation Report", f"{state_prefix}_Task9_Validation_Table.png")

        # --- OUTPUT 2: Noise Scatter Plot ---
        plt.figure(figsize=(9, 5))
        for _, r in results_df.iterrows():
            pct_val = float(r['% Changed'].strip('%'))
            color = '#d62728' if r['Status'] == 'NOISE' else '#2ca02c'
            plt.scatter(r['Total Area'], pct_val, color=color, s=60, zorder=3)
            plt.annotate(r['District'], (r['Total Area'], pct_val), fontsize=7, alpha=0.7)

        plt.axhline(y=0.5, color='orange', linestyle='--', label='0.5% Noise Floor')
        plt.xlabel('Total District Area (km²)')
        plt.ylabel('% Area Changed (2016–2025)')
        plt.title(f'{state_prefix}: Signal vs Noise Validation')
        
        legend_elements = [
            Line2D([0], [0], marker='o', color='w', markerfacecolor='#2ca02c', markersize=8, label='Valid Change'),
            Line2D([0], [0], marker='o', color='w', markerfacecolor='#d62728', markersize=8, label='Classification Noise')
        ]
        plt.legend(handles=legend_elements)
        plt.tight_layout()
        plt.savefig(f"{state_prefix}_Task9_Noise_Validation_Plot.png", dpi=150)
        plt.close()

    except Exception as e: print(f"Error Task 9: {e}")

# --- EXECUTION ---
if __name__ == "__main__":
    for s in ['Punjab', 'UK']:
        task8_composite_index(s)
        task9_noise_validation(s)
    print("\nVisual reports generated for Task 8 and Task 9.")