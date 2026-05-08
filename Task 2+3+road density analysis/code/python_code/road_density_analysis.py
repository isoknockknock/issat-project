import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import ast

# Set visual style for presentation
sns.set_theme(style="whitegrid")
plt.rcParams['font.family'] = 'sans-serif'

def parse_gee_results(df, key_name):
    """
    Parses the 'groups' column string into actual columns.
    Example: converts [{class=3, sum=10.5}] into a column 'class_3' with value 10.5.
    """
    new_rows = []
    for _, row in df.iterrows():
        row_dict = row.to_dict()
        groups_str = str(row.get('groups', '[]'))
        
        # Standardize GEE key=value format to Python dict format
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

def analyze_infrastructure_impact(state_prefix):
    print(f"Analyzing road impact for {state_prefix}...")

    try:
        # 1. Load Data
        # Road density files are usually flat, no parsing needed unless they also have a 'groups' column
        road_df = pd.read_csv(f"{state_prefix}_RoadDensity_byDistrict.csv")
        r_col = 'road_km_total' if 'road_km_total' in road_df.columns else 'sum'
        
        # Target: Built-up (Class 3)
        target_class = 'class_3' 
        
        # Load and PARSE the District Stats files
        c16_raw = pd.read_csv(f"{state_prefix}_DistrictStats_2016.csv")
        c25_raw = pd.read_csv(f"{state_prefix}_DistrictStats_2025.csv")
        
        c16 = parse_gee_results(c16_raw, 'class')[['ADM2_NAME', target_class]]
        c25 = parse_gee_results(c25_raw, 'class')[['ADM2_NAME', target_class]]
        
        # 2. Merge and Calculate Urban Growth
        merged = pd.merge(c16, c25, on='ADM2_NAME', suffixes=('_2016', '_2025'))
        merged = pd.merge(merged, road_df[['ADM2_NAME', r_col]], on='ADM2_NAME')
        
        # Calculate net urban growth in km2
        merged['Urban_Growth_km2'] = merged[f'{target_class}_2025'] - merged[f'{target_class}_2016']
        merged = merged.rename(columns={r_col: 'Road_Length_km'})

        # 3. Statistical Calculation
        correlation = merged['Urban_Growth_km2'].corr(merged['Road_Length_km'])
        
        # 4. Generate Regression Plot
        plt.figure(figsize=(10, 7))
        sns.regplot(
            data=merged, 
            x='Road_Length_km', 
            y='Urban_Growth_km2', 
            color='#c0392b', 
            scatter_kws={'s': 80, 'alpha': 0.6, 'edgecolor': 'w'},
            line_kws={'label': f"Correlation: {correlation:.4f}", 'color': '#2c3e50', 'lw': 3}
        )
        
        plt.title(f'{state_prefix.upper()}: Road Infrastructure vs. Built-up Expansion (Class 3)', fontsize=16, pad=20, weight='bold')
        plt.xlabel('Total District Road Length (km)', fontsize=12)
        plt.ylabel('New Built-up Area 2016-2025 (km²)', fontsize=12)
        plt.legend(loc='upper left', fontsize=12)
        plt.tight_layout()
        
        plot_name = f"{state_prefix}_Road_Correlation_Plot.png"
        plt.savefig(plot_name, dpi=300)
        plt.close()

        # 5. Generate Summary Table for Slides
        summary_table = merged[['ADM2_NAME', 'Road_Length_km', 'Urban_Growth_km2']].sort_values('Urban_Growth_km2', ascending=False).head(8)
        summary_table.columns = ['District', 'Road Length (km)', 'Built-up Growth (km²)']
        
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.axis('off')
        tbl = ax.table(cellText=summary_table.values, colLabels=summary_table.columns, loc='center', cellLoc='center')
        tbl.auto_set_font_size(False)
        tbl.set_fontsize(11)
        tbl.scale(1.2, 2)
        
        # Style table header
        for (row, col), cell in tbl.get_celld().items():
            if row == 0:
                cell.set_text_props(weight='bold', color='white')
                cell.set_facecolor('#2c3e50')
        
        plt.title(f"{state_prefix.upper()}: Road-Urban Growth Analysis", fontsize=14, weight='bold', pad=10)
        plt.savefig(f"{state_prefix}_Road_Stats_Table.png", bbox_inches='tight', dpi=300)
        plt.close()

        print(f"Successfully generated analysis for {state_prefix}.")
        print(f"Correlation Coefficient: {correlation:.4f}")

    except Exception as e:
        print(f"Error analyzing {state_prefix}: {e}")

# Run for both states
if __name__ == "__main__":
    for s in ['Punjab', 'UK']:
        analyze_infrastructure_impact(s)