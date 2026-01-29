#!/usr/bin/env python3
"""
COMPLETE JSON DUPLICATE FILENAME SCANNER - Fixed for case-sensitive detection
Scans levels1-12.json, levels13-24.json, levels25-36.json for EXACT filename duplicates
"""

import os
import json
from pathlib import Path
from collections import defaultdict

def find_duplicates():
    script_dir = Path(__file__).parent.absolute()
    
    # Specific files you mentioned
    target_files = [
        "levels1-12.json",
        "levels13-24.json", 
        "levels25-36.json"
    ]
    
    print(f"🔍 Scanning 3 specific files in: {script_dir}")
    print("=" * 80)
    
    # Track ALL filename occurrences: {filename: [(file, level_id, word_idx, full_word_data), ...]}
    filename_locations = defaultdict(list)
    stats = {"valid": 0, "skipped": 0, "empty": 0}
    
    for filename in target_files:
        file_path = script_dir / filename
        
        print(f"\n📄 {filename}", end=" ")
        if not file_path.exists():
            print("❌ MISSING FILE")
            stats["skipped"] += 1
            continue
            
        file_size = file_path.stat().st_size
        if file_size == 0:
            print("⏭️ EMPTY")
            stats["empty"] += 1
            continue
        
        print(f"({file_size} bytes)", end=" ... ")
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read().strip()
                if not content:
                    print("⏭️ WHITESPACE ONLY")
                    stats["empty"] += 1
                    continue
                
                data = json.loads(content)
                stats["valid"] += 1
                print("✅ LOADED")
                
                # Extract ALL filenames with EXACT CASE matching
                if isinstance(data, dict) and 'levels' in data:
                    for level_idx, level in enumerate(data['levels']):
                        if not isinstance(level, dict): 
                            continue
                            
                        level_id = level.get('id', f"L{level_idx+1}")
                        words = level.get('words', [])
                        
                        for word_idx, word in enumerate(words):
                            if isinstance(word, dict):
                                filename_field = word.get('filename', '').strip()
                                
                                if filename_field:  # Non-empty filename
                                    # Store EXACT original filename (case-sensitive)
                                    location_info = (filename, level_id, word_idx + 1, word)
                                    filename_locations[filename_field].append(location_info)
                                    
        except json.JSONDecodeError as e:
            print(f"❌ JSON ERROR: {str(e)[:50]}")
            stats["skipped"] += 1
        except Exception as e:
            print(f"❌ ERROR: {str(e)[:50]}")
            stats["skipped"] += 1
    
    # === REPORT RESULTS ===
    print("\n" + "=" * 80)
    print("📊 STATS:", stats)
    print("\n🔍 FILENAME DUPLICATES (EXACT MATCH):")
    print("-" * 80)
    
    duplicates_found = 0
    for filename_value, locations in sorted(filename_locations.items()):
        if len(locations) > 1:
            duplicates_found += 1
            print(f"\n🚨 DUPLICATE: '{filename_value}' ({len(locations)} occurrences)")
            print("   Locations:")
            
            for file_name, level_id, word_idx, word_data in locations:
                word = word_data.get('word', 'UNKNOWN')
                print(f"     • {file_name} [Level {level_id}, Word #{word_idx}] = '{word}'")
    
    if duplicates_found == 0:
        print("\n✅ PERFECT! No duplicate filenames found.")
        print("   All filenames are UNIQUE across all files.")
    else:
        print(f"\n⚠️  {duplicates_found} duplicate filename(s) found!")

if __name__ == "__main__":
    try:
        find_duplicates()
        print("\n🎉 Scan complete!")
    except KeyboardInterrupt:
        print("\n⏹️  Stopped by user")
    except Exception as e:
        print(f"\n💥 CRASH: {e}")

