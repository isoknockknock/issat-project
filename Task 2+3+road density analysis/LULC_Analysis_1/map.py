import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import ast

# --- UPDATED CONFIGURATION ---
CLASS_MAP = {0: "Water", 1: "Vegetation", 2: "Cropland", 3: "Built-up", 4: "Barren"}
target_classes = [0, 1, 2, 3, 4]
sns.set_theme(style="white")

def parse_gee_results(df, key_name):
    """Unpacks GEE 'groups' column into actual numeric columns."""
    new_rows = []
    for _, row in df.iterrows():
        row_dict = row.to_dict()
        groups_str = str(row.get('groups', '[]'))
        # Convert GEE format to valid Python dict format
        clean_str = groups_str.replace('=', ':').replace(key_name, f'"{key_name}"').replace('sum', '"sum"')
        try:
            groups_list = ast.literal_eval(clean_str)
            for item in groups_list:
                col_name = f"{key_name}_{item[key_name]}"
                row_dict[col_name] = item['sum']
                # Also create a generic 'Area (km2)' for sorting in tables
                row_dict['Area (km2)'] = item['sum'] 
        except:
            pass
        new_rows.append(row_dict)
    return pd.DataFrame(new_rows).fillna(0)

def create_transition_heatmap(state_prefix):
    try:
        # Load and Parse
        raw_df = pd.read_csv(f"{state_prefix}_Transition_2016_2025.csv")
        df = parse_gee_results(raw_df, 'transition')
        
        matrix = np.zeros((len(target_classes), len(target_classes)))
        labels = [CLASS_MAP[c] for c in target_classes]
        
        for i, c1 in enumerate(target_classes):
            for j, c2 in enumerate(target_classes):
                col_name = f"transition_{c1 * 10 + c2}"
                if col_name in df.columns:
                    matrix[i, j] = df[col_name].sum()

        matrix_df = pd.DataFrame(matrix, index=labels, columns=labels)
        mask = np.eye(len(matrix_df))
        
        plt.figure(figsize=(10, 8))
        sns.heatmap(matrix_df, annot=True, fmt=".1f", cmap="YlOrRd", mask=mask)
        plt.title(f"{state_prefix.upper()}: Transition Heatmap (km2)")
        plt.savefig(f"{state_prefix}_Transition_Heatmap.png", dpi=300)
        plt.close()
    except Exception as e:
        print(f"Error in Heatmap for {state_prefix}: {e}")

def create_district_summary_table(state_prefix):
    try:
        raw_df = pd.read_csv(f"{state_prefix}_Transition_2016_2025.csv")
        df = parse_gee_results(raw_df, 'transition')
        
        # Filter for actual change columns
        change_cols = [c for c in df.columns if c.startswith('transition_') and int(c.split('_')[1]) % 11 != 0]
        
        results = []
        for _, row in df.iterrows():
            valid_cols = [c for c in change_cols if row[c] > 0]
            if not valid_cols: continue
            
            dom_col = row[valid_cols].idxmax()
            area = row[dom_col]
            code = int(dom_col.split('_')[1])
            start, end = code // 10, code % 10
            
            results.append({
                "District": row['ADM2_NAME'],
                "Major Change": f"{CLASS_MAP[start]} → {CLASS_MAP[end]}",
                "Area (km2)": area
            })

        summary_df = pd.DataFrame(results).sort_values("Area (km2)", ascending=False).head(15)
        
        # Visual Table
        fig, ax = plt.subplots(figsize=(10, len(summary_df)*0.5))
        ax.axis('off')
        ax.table(cellText=summary_df.values, colLabels=summary_df.columns, loc='center')
        plt.savefig(f"{state_prefix}_District_Dominance.png", bbox_inches='tight')
        plt.close()
    except Exception as e:
        print(f"Error in District Summary for {state_prefix}: {e}")

def create_composition_bar(state_prefix):
    try:
        years = ['2016', '2020', '2025']
        comp_data = []
        for yr in years:
            raw_df = pd.read_csv(f"{state_prefix}_DistrictStats_{yr}.csv")
            df = parse_gee_results(raw_df, 'class')
            
            sums = {}
            for c_id in target_classes:
                col_name = f"class_{c_id}"
                sums[CLASS_MAP[c_id]] = df[col_name].sum() if col_name in df.columns else 0
            comp_data.append(sums)
        
        summary = pd.DataFrame(comp_data, index=years)
        colors = ['#419BDF', '#397D49', '#E49635', '#C4281B', '#A59B8F']
        
        summary.plot(kind='bar', stacked=True, figsize=(10, 6), color=colors)
        plt.title(f"{state_prefix.upper()}: LULC Composition")
        plt.ylabel("Area (km2)")
        plt.legend(bbox_to_anchor=(1.05, 1))
        plt.tight_layout()
        plt.savefig(f"{state_prefix}_Composition_Trends.png")
        plt.close()
    except Exception as e:
        print(f"Error in Composition Bar for {state_prefix}: {e}")

# --- EXECUTION ---
for state in ['Punjab', 'UK']:
    print(f"Processing {state}...")
    create_composition_bar(state)
    create_transition_heatmap(state)
    create_district_summary_table(state)