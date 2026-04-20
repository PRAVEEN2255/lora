import time

class NodeState:
    def __init__(self):
        self.history = []
        self.current_lat = None
        self.current_lng = None
        self.is_estimated = False
        self.last_update_time = None

class StateBuffer:
    def __init__(self):
        self.nodes = {}

    def get_node(self, node_id):
        if node_id not in self.nodes:
            self.nodes[node_id] = NodeState()
        return self.nodes[node_id]

    def get_all_states(self):
        states = []
        for node_id, state in self.nodes.items():
            if state.current_lat is not None:
                states.append({
                    "id": node_id,
                    "lat": state.current_lat,
                    "lng": state.current_lng,
                    "is_estimated": state.is_estimated,
                    "timestamp": state.last_update_time
                })
        return states
