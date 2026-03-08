import re
import sys

def sniff_fbx_objects(filepath):
    try:
        with open(filepath, 'rb') as f:
            data = f.read()

        # In binary FBX, object names are often stored before their class/subclass, e.g. "Cell_1\x00\x01Model"
        
        # We can look for common names
        targets = [b'cell', b'battery', b'fan', b'blade', b'shell', b'case', b'pcb', b'board']
        found_names = set()
        
        # Simple heuristic: look for ASCII strings of length > 3
        matches = re.finditer(b'[A-Za-z0-9_ -]{3,}', data)
        for m in matches:
            text = m.group(0).lower()
            if any(t in text for t in targets):
                found_names.add(m.group(0).decode('ascii', errors='ignore'))
                
        print("Possible relevant names in FBX:")
        for name in sorted(list(found_names)):
            print(f"  - {name}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        sniff_fbx_objects(sys.argv[1])
    else:
        print("Provide FBX path")
