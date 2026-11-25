"""Rebuild the browser snapshot from the two sibling LLJS checkouts."""
import argparse
import csv
import json
import re
import shutil
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--atlas", type=Path, default=ROOT.parent / "linked-jazz-lljs-map")
parser.add_argument("--project", type=Path, default=ROOT.parent / "linked-jazz-lljs")
args = parser.parse_args()
atlas, project = args.atlas, args.project
assets = ROOT / "assets"


def read(path):
    return json.loads(path.read_text())


def rows(path):
    with path.open(newline="") as file:
        return list(csv.DictReader(file, delimiter="\t"))


def value(snak):
    data = snak.get("datavalue", {}).get("value", {})
    return data.get("id") if isinstance(data, dict) else data


def map_projection(annotation, width, height):
    """Inverse of the atlas's order-one fit, scaled to the local scan."""
    points = [(*f["properties"]["resourceCoords"], *f["geometry"]["coordinates"])
              for f in annotation["body"]["features"]]
    mx, my, mlon, mlat = [sum(col) / len(col) for col in zip(*points)]
    centered = [(x-mx, y-my, lon-mlon, lat-mlat) for x,y,lon,lat in points]
    xx, xy, yy, xl, yl, xt, yt = [
        sum(row[i]*row[j] for row in centered)
        for i,j in [(0,0),(0,1),(1,1),(0,2),(1,2),(0,3),(1,3)]]
    det = xx*yy - xy*xy
    a, b = (yy*xl-xy*yl)/det, (xx*yl-xy*xl)/det
    c, d = (yy*xt-xy*yt)/det, (xx*yt-xy*xt)/det
    source = annotation["target"]["source"]

    def pixel(lon, lat):
        lon, lat = lon-mlon, lat-mlat
        x = mx + (lon*d-lat*b)/(a*d-b*c)
        y = my + (lat*a-lon*c)/(a*d-b*c)
        return round(x*width/source["width"]), round(y*height/source["height"])
    return pixel


catalog = read(atlas / "data/brooklyn_jazz_sites.json")
shrines = {s["qid"]: s for s in catalog["sites"] if "shrine" in s["kind"]}
wb = read(project / "reconcile/cache/wb_entities.json")
docs = read(project / "address/docs.json")
properties = {v[0]: k for k, v in read(project / "process/ref/properties.json").items()}
portraits = read(atlas / "data/people_portraits.json")
jazz = read(project / "reconcile/cache/ql_jazz.json")
wd_entities = read(project / "reconcile/cache/ql_entities.json")
matches = {r["wikibase_qid"]: r["wikidata_qid"]
           for r in rows(project / "reconcile/out/wikidata_links.tsv")
           if r["status"] == "already linked" or (r["status"] == "new match" and r["confidence"] == "high")}
interviews = defaultdict(list)
for d in docs:
    for st in wb[d["doc"]]["claims"]["P13"]:
        interviews[value(st["mainsnak"])].append({"id": d["doc"], "name": d["name"]})

# Only explicit musical activity counts as additional musician evidence in the oral histories.
music_claims = {"P35", "P36", "P37"}
music_playing = defaultdict(set)
venue_performers = set()
references = defaultdict(set)
block_id = {(r["doc"], r["local_id"]): r["qid"] for r in rows(project / "load/block_qids.tsv")}
local_id = {(r["slug"], r["transcript_block"]): r["local_id"] for r in rows(project / "load/blocks_map.tsv")}
block_names = {r["qid"]: (r["doc"], r["local_id"]) for r in rows(project / "load/block_qids.tsv")}
block_names.update({r["qid"]: (r["doc"], r["n"]) for r in rows(project / "address/done_block_qids.tsv")})
for r in rows(project / "load/statements.loaded.tsv"):
    block = block_id[r["doc"], local_id[r["slug"], r["block"]]]
    references[r["subj"], r["pid"], r["obj"]].add(block)
    if r["pid"] == "P68" and r["obj"] in shrines:
        venue_performers.add(r["subj"])
    if r["pid"] in music_claims:
        music_playing[r["subj"]].add(r["pid"])
        music_playing[r["obj"]].add(r["pid"])
for q, entity in wb.items():
    for pid, claims in entity.get("claims", {}).items():
        for st in claims:
            other = value(st["mainsnak"])
            if not other or st.get("rank") == "deprecated":
                continue
            if pid == "P68" and other in shrines:
                venue_performers.add(q)
            if pid in music_claims:
                music_playing[q].add(pid)
                music_playing[other].add(pid)
            if q in shrines or other in shrines:
                for ref in st.get("references", []):
                    references[q, pid, other].update(value(v) for v in ref["snaks"].get("P26", []) if value(v))

def musician_evidence(q):
    wd = matches.get(q)
    record = wd_entities.get(wd, {})
    facts = record.get("facts", {})
    group = jazz.get(wd, {}).get("set")
    occupations = " ".join(facts.get("occupation", []))
    if group == "jazz musician" or "jazz musician" in occupations:
        return "Wikidata records a jazz musician occupation."
    musical = re.search(r"musician|singer|vocalist|pianist|guitarist|drummer|trumpeter|bassist|saxophonist|trombonist|clarinetist|percussionist|bandleader|organist|vibraphonist|flautist|flutist", occupations)
    if group == "genre jazz human" and (facts.get("instrument") or musical):
        return "Wikidata records a jazz genre and a musical occupation or instrument."
    if re.search(r"\bjazz (?:musician|singer|vocalist|pianist|guitarist|drummer|trumpeter|bassist|saxophonist|trombonist|bandleader|percussionist)\b", record.get("desc", ""), re.I):
        return "The linked Wikidata description identifies a jazz musician."
    if q in venue_performers and music_playing.get(q) and (not wd or musical or "composer" in occupations):
        return "Project statements record a shrine performance and playing with other musicians."
    return None


nodes = {}
def make_person(q, name):
    if q in nodes:
        return True
    evidence = musician_evidence(q)
    if q not in interviews and not evidence:
        return False
    n = {"id": q, "name": name, "type": "interviewee" if q in interviews else "musician"}
    if interviews.get(q):
        n["interviews"] = interviews[q]
    if evidence:
        n["musicianEvidence"] = evidence
    if q in matches:
        wd = n["wikidata"] = matches[q]
        n["description"] = wd_entities.get(wd, {}).get("desc", "")
    photo = portraits.get(q, {})
    if photo.get("local"):
        shutil.copyfile(atlas / photo["local"], assets / "portraits" / (q + ".webp"))
        n["photo"] = "assets/portraits/" + q + ".webp"
        n["credit"] = ("https://commons.wikimedia.org/wiki/File:" + photo["commonsFile"]
                       if photo.get("commonsFile") else photo["url"])
    nodes[q] = n
    return True


for key in ["portraits", "maps"]:
    (assets / key).mkdir(parents=True, exist_ok=True)
for q in list(interviews):
    make_person(q, wb[q]["labels"]["en"]["value"])

scan = Image.open(atlas / "data/default.jpg")
pixel = map_projection(read(atlas / "data/geo_ref.json"), *scan.size)
edges = defaultdict(lambda: {"details": set(), "blocks": set()})
person_item = re.compile(r"(.+) \((Q\d+), (person|music group)\)")
for q, s in shrines.items():
    n = nodes[q] = {"id": q, "name": s["name"], "type": "shrine", "address": s["address"],
                    "aliases": s["also_called"], "start": s["wikibase"]["start_year"],
                    "end": s["wikibase"]["end_year"]}
    if s["latitude"] is not None and s["longitude"] is not None:
        x,y = pixel(s["longitude"], s["latitude"])
        if 0 <= x < scan.width and 0 <= y < scan.height:
            box = (x-400, y-150, x+400, y+150)
            scan.crop(box).resize((640,240), Image.Resampling.LANCZOS).save(assets / "maps" / (q+".webp"), quality=72)
            n["map"] = "assets/maps/" + q + ".webp"
    text = (project / "sites/dossiers" / (q + ".md")).read_text()
    statements = text.split("## Statements on the wikibase linking it to people and groups\n", 1)[1].split("## Interview passages", 1)[0]
    for line in statements.splitlines():
        if not line.startswith("- ") or line == "- none":
            continue
        triple, sep, qualifiers = line[2:].partition(" [")
        left, label, right = triple.split(" — ")
        outgoing = left == "this place"
        name, person, kind = person_item.fullmatch(right if outgoing else left).groups()
        if kind != "person" or not make_person(person, name):
            continue
        src, dst = (q, person) if outgoing else (person, q)
        entry = edges[src, label, dst]
        if sep:
            entry["details"].add(qualifiers.removesuffix("]"))
        entry["blocks"].update(b for b in references.get((src, properties[label], dst), ()) if b in block_names)

doc_names = {d["doc"]: d["name"] for d in docs}
def source_block(q):
    doc, num = block_names[q]
    return [q, doc_names[doc] + " · block " + num]

relations = [{"source": s, "target": t, "label": label, "pid": properties[label],
              "details": sorted(info["details"]), "blocks": [source_block(q) for q in sorted(info["blocks"])]}
             for (s, label, t), info in sorted(edges.items())]
# Keep one complete local copy of each cited passage, keyed by the Wikibase block.
cited_blocks = {qid for relation in relations for qid, _ in relation["blocks"]}
block_by_location = {location: qid for qid, location in block_names.items() if qid in cited_blocks}
passages = {}
for doc in docs:
    transcript = (project / "address/blocks" / (doc["slug"] + ".txt")).read_text()
    parts = re.split(r"^=== BLOCK ([\d.]+) ===$", transcript, flags=re.M)
    for transcript_num, text in zip(parts[1::2], parts[2::2]):
        num = local_id.get((doc["slug"], transcript_num)) if doc["source"] == "process" else transcript_num
        qid = block_by_location.get((doc["doc"], num))
        if qid and text.strip():
            passages[qid] = re.sub(r"[ \t]+", " ", text.replace("‡", "")).strip()
print(f"Found passage text for {len(passages)} of {len(cited_blocks)} cited blocks.")
output = {"passages": passages, "date": catalog["generated"], "nodes": sorted(nodes.values(), key=lambda n: n["name"].casefold()), "edges": relations}
(assets / "network.js").write_text("window.JAZZ_NETWORK = " + json.dumps(output, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(Counter(n["type"] for n in nodes.values()), len(edges), "directed relationships")
